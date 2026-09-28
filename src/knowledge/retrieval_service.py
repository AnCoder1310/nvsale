from datetime import date
from typing import Any

from backend.knowledge.metadata import DocumentStatus, DocumentType, IngestedChunk
from src.knowledge.chunking import load_and_chunk_corpus
from src.knowledge.vector_store import BaseVectorStore, get_vector_store
from src.services.llm import get_embeddings


class RetrievalService:
    """Orchestrates ingestion, vector similarity search, and policy validity filtering."""

    def __init__(self, vector_store: BaseVectorStore | None = None):
        self.vector_store = vector_store or get_vector_store()
        self.embeddings = get_embeddings()

    def ingest_corpus(self, corpus_path: str = "data/knowledge/corpus.json") -> int:
        """Load and index corpus documents into the vector store."""
        chunks = load_and_chunk_corpus(corpus_path)
        if not chunks:
            return 0

        texts = [c.content for c in chunks]
        vectors = self.embeddings.embed_documents(texts)
        self.vector_store.upsert_chunks(chunks, vectors)
        return len(chunks)

    def retrieve(
        self,
        query: str,
        product_model: str | None = None,
        document_type: str | None = None,
        policy_type: str | None = None,
        top_k: int = 4,
        target_date: date | None = None,
    ) -> list[IngestedChunk]:
        """Retrieve relevant chunks and filter out expired policies."""
        query_vector = self.embeddings.embed_query(query)

        where: dict[str, Any] = {}
        if product_model and product_model.upper() != "ALL":
            # For strictly product_specs, target that specific model.
            # For policies, promotions, battlecards or general queries, also include general policies ("ALL").
            if document_type == DocumentType.PRODUCT_SPECS.value:
                where["product_model"] = product_model
            else:
                where["product_model"] = [product_model, "ALL"]

        if document_type:
            where["document_type"] = document_type
        if policy_type:
            where["policy_type"] = policy_type

        # Fetch extra candidates to account for date filtering
        fetch_k = max(top_k * 2, top_k + 2)
        candidates = self.vector_store.similarity_search(
            query_embedding=query_vector,
            top_k=fetch_k,
            where=where if where else None,
        )

        # Date & policy filtering
        effective_now = target_date or date.today()
        valid_chunks: list[IngestedChunk] = []

        for chunk in candidates:
            meta = chunk.metadata
            # If status is expired, skip
            if meta.status == DocumentStatus.EXPIRED:
                continue

            # Check effective/expiry date
            if meta.effective_date and meta.effective_date > effective_now:
                continue
            if meta.expiry_date and meta.expiry_date < effective_now:
                continue

            valid_chunks.append(chunk)
            if len(valid_chunks) >= top_k:
                break

        return valid_chunks

    def search_product(self, query: str, product_model: str | None = None, top_k: int = 3) -> list[IngestedChunk]:
        """Convenience search for product specs."""
        return self.retrieve(
            query=query, product_model=product_model, document_type=DocumentType.PRODUCT_SPECS.value, top_k=top_k
        )

    def search_policy(
        self,
        query: str,
        policy_type: str | None = None,
        target_date: date | None = None,
        top_k: int = 3,
    ) -> list[IngestedChunk]:
        """Convenience search for active policies."""
        return self.retrieve(
            query=query,
            document_type=DocumentType.POLICY.value,
            policy_type=policy_type,
            target_date=target_date,
            top_k=top_k,
        )

    def get_product_comparison(
        self, vf_model: str, competitor_model: str | None = None, top_k: int = 3
    ) -> list[IngestedChunk]:
        """Convenience search for battlecards against competitors."""
        query = f"So sánh {vf_model} với {competitor_model or 'đối thủ'}"
        return self.retrieve(
            query=query, product_model=vf_model, document_type=DocumentType.BATTLECARD.value, top_k=top_k
        )

    def get_current_promotion(
        self, product_model: str | None = None, target_date: date | None = None, top_k: int = 3
    ) -> list[IngestedChunk]:
        """Convenience search for active promotions and price incentives."""
        return self.retrieve(
            query="chương trình khuyến mãi ưu đãi bảng giá",
            product_model=product_model,
            document_type=DocumentType.PROMOTION.value,
            target_date=target_date,
            top_k=top_k,
        )

    def citation_validator(self, citations: list[Any]) -> bool:
        """Validate whether all citations contain a valid document_id."""
        if not citations:
            return False
        for c in citations:
            doc_id = c.get("document_id") if isinstance(c, dict) else getattr(c, "document_id", None)
            if not doc_id:
                return False
        return True


_retrieval_service_instance: RetrievalService | None = None


def get_retrieval_service() -> RetrievalService:
    global _retrieval_service_instance
    if _retrieval_service_instance is None:
        _retrieval_service_instance = RetrievalService()
    return _retrieval_service_instance
