import json
import logging
import time
from pathlib import Path
from typing import Any

from src.knowledge.chunking import chunk_document
from src.knowledge.embedding import KnowledgeEmbeddingService
from src.knowledge.schemas import KnowledgeChunk, KnowledgeDocument
from src.knowledge.vector_store import BaseVectorStore, get_vector_store

logger = logging.getLogger(__name__)


class KnowledgeIngestionPipeline:
    """Pipeline nạp kiến thức từ corpus.json vào Vector Database."""

    def __init__(
        self,
        vector_store: BaseVectorStore | None = None,
        embedding_service: KnowledgeEmbeddingService | None = None,
        chunk_size: int = 1000,
        chunk_overlap: int = 100,
    ):
        self.vector_store = vector_store or get_vector_store()
        self.embedding_service = embedding_service or KnowledgeEmbeddingService()
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def run(
        self,
        corpus_path: str | Path = "data/knowledge/corpus.json",
        reset: bool = False,
    ) -> dict[str, Any]:
        """Thực thi toàn bộ chu trình ingestion: Đọc -> Validate -> Chunk -> Embed -> Index."""
        start_time = time.perf_counter()
        path = Path(corpus_path)
        if not path.exists():
            return {
                "status": "failed",
                "documents": 0,
                "chunks": 0,
                "chunking_strategy": f"RecursiveCharacterTextSplitter (chunk_size={self.chunk_size}, chunk_overlap={self.chunk_overlap})",
                "embedding_model": self.embedding_service.model_name,
                "vector_store": self.vector_store.__class__.__name__,
                "elapsed_seconds": 0.0,
                "errors": [f"Corpus file not found: {path}"],
            }

        if reset:
            self.vector_store.reset()

        raw_items = json.loads(path.read_text(encoding="utf-8"))
        documents: list[KnowledgeDocument] = []
        errors: list[str] = []

        for item in raw_items:
            try:
                doc = KnowledgeDocument.model_validate(item)
                documents.append(doc)
            except Exception as e:
                doc_id = item.get("document_id", "unknown") if isinstance(item, dict) else "unknown"
                errors.append(f"Validation error for {doc_id}: {e}")

        all_chunks: list[KnowledgeChunk] = []
        for doc in documents:
            chunks = chunk_document(doc, chunk_size=self.chunk_size, chunk_overlap=self.chunk_overlap)
            all_chunks.extend(chunks)

        if all_chunks:
            vectors = self.embedding_service.embed_chunks(all_chunks)
            self.vector_store.upsert_chunks(all_chunks, vectors)

        elapsed = round(time.perf_counter() - start_time, 3)
        return {
            "status": "success" if not errors else "partial_success",
            "documents": len(documents),
            "chunks": len(all_chunks),
            "chunking_strategy": f"RecursiveCharacterTextSplitter (chunk_size={self.chunk_size}, chunk_overlap={self.chunk_overlap})",
            "embedding_model": self.embedding_service.model_name,
            "vector_store": self.vector_store.__class__.__name__,
            "elapsed_seconds": elapsed,
            "errors": errors,
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    pipeline = KnowledgeIngestionPipeline()
    result = pipeline.run(reset=True)
    print("=" * 65)
    print("KNOWLEDGE INGESTION PIPELINE")
    print("=" * 65)
    print(f"* Status            : {result['status'].upper()}")
    print(f"* Chunking Strategy : {result['chunking_strategy']}")
    print(f"* Embedding Model   : {result['embedding_model']}")
    print(f"* Vector Store      : {result['vector_store']}")
    print(f"* Total Documents   : {result['documents']}")
    print(f"* Total Chunks      : {result['chunks']}")
    print(f"* Execution Time    : {result['elapsed_seconds']}s")
    if result["errors"]:
        print(f"* Errors            : {result['errors']}")
    print("=" * 65)
