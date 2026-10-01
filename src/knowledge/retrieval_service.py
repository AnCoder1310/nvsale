from datetime import date
from typing import Any

from src.knowledge.embedding import KnowledgeEmbeddingService
from src.knowledge.schemas import DocumentStatus, DocumentType, KnowledgeChunk
from src.knowledge.vector_store import BaseVectorStore, get_vector_store


def _parse_date(val: Any) -> date | None:
    if val is None:
        return None
    if isinstance(val, date):
        return val
    try:
        return date.fromisoformat(str(val))
    except Exception:
        return None


class RetrievalService:
    """Orchestrates ingestion, vector similarity search, and policy validity filtering."""

    def __init__(
        self,
        vector_store: BaseVectorStore | None = None,
        embedding_service: KnowledgeEmbeddingService | None = None,
    ):
        self.vector_store = vector_store or get_vector_store()
        self.embedding_service = embedding_service or KnowledgeEmbeddingService()

    def ingest_corpus(self, corpus_path: str = "data/knowledge/corpus.json") -> int:
        """Load and index corpus documents into the vector store."""
        from src.knowledge.ingestion import KnowledgeIngestionPipeline

        pipeline = KnowledgeIngestionPipeline(
            vector_store=self.vector_store,
            embedding_service=self.embedding_service,
        )
        report = pipeline.run(corpus_path)
        return report["chunks"]

    def retrieve(
        self,
        query: str,
        product_model: str | None = None,
        document_type: str | None = None,
        policy_type: str | None = None,
        top_k: int = 4,
        target_date: date | None = None,
    ) -> list[KnowledgeChunk]:
        """Retrieve relevant chunks and filter out expired policies."""
        query_vector = self.embedding_service.embed_query(query)

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
        valid_chunks: list[KnowledgeChunk] = []

        for chunk in candidates:
            meta = chunk.metadata
            status_val = meta.status.value if hasattr(meta.status, "value") else str(meta.status)
            if status_val == DocumentStatus.EXPIRED.value:
                continue

            # Check effective/expiry date
            eff_d = _parse_date(meta.effective_date)
            exp_d = _parse_date(meta.expiry_date)

            if eff_d and eff_d > effective_now:
                continue
            if exp_d and exp_d < effective_now:
                continue

            valid_chunks.append(chunk)
            if len(valid_chunks) >= top_k:
                break

        return valid_chunks

    def search_product(self, query: str, product_model: str | None = None, top_k: int = 3) -> list[KnowledgeChunk]:
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
    ) -> list[KnowledgeChunk]:
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
    ) -> list[KnowledgeChunk]:
        """Convenience search for battlecards against competitors."""
        query = f"So sánh {vf_model} với {competitor_model or 'đối thủ'}"
        return self.retrieve(
            query=query, product_model=vf_model, document_type=DocumentType.BATTLECARD.value, top_k=top_k
        )

    def get_current_promotion(
        self, product_model: str | None = None, target_date: date | None = None, top_k: int = 3
    ) -> list[KnowledgeChunk]:
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
