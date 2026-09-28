import json
from pathlib import Path

from backend.knowledge.metadata import ChunkMetadata, IngestedChunk, NormalizedDocument


def chunk_document(doc: NormalizedDocument, max_chunk_chars: int = 1000) -> list[IngestedChunk]:
    """Split a NormalizedDocument into one or more IngestedChunks."""
    content = doc.content.strip()

    # Append sales script context if available for richer retrieval
    sales_script_text = ""
    if doc.sales_script:
        bullets = " ".join([f"- {arg}" for arg in doc.sales_script.core_arguments])
        sales_script_text = f"\n[Gợi ý bán hàng]: {bullets}\n[Mẫu tin nhắn]: {doc.sales_script.suggested_message}"

    if len(content) <= max_chunk_chars:
        chunks_text = [content + sales_script_text]
    else:
        # Split on double newline or sentences
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        chunks_text = []
        current_chunk = []
        current_len = 0

        for p in paragraphs:
            if current_len + len(p) > max_chunk_chars and current_chunk:
                chunks_text.append("\n\n".join(current_chunk))
                current_chunk = [p]
                current_len = len(p)
            else:
                current_chunk.append(p)
                current_len += len(p)

        if current_chunk:
            chunks_text.append("\n\n".join(current_chunk) + sales_script_text)

    ingested: list[IngestedChunk] = []
    for idx, text in enumerate(chunks_text):
        chunk_id = f"{doc.document_id}_{idx}"
        metadata = ChunkMetadata(
            chunk_id=chunk_id,
            document_id=doc.document_id,
            document_type=doc.document_type,
            product_model=doc.product_model,
            policy_type=doc.policy_type,
            effective_date=doc.effective_date,
            expiry_date=doc.expiry_date,
            status=doc.status,
            source=doc.source,
            chunk_index=idx,
        )
        ingested.append(
            IngestedChunk(
                chunk_id=chunk_id,
                document_id=doc.document_id,
                content=text,
                metadata=metadata,
            )
        )

    return ingested


def load_and_chunk_corpus(corpus_path: str | Path = "data/knowledge/corpus.json") -> list[IngestedChunk]:
    """Load JSON corpus and chunk all valid normalized documents."""
    path = Path(corpus_path)
    if not path.exists():
        raise FileNotFoundError(f"Corpus file not found: {path}")

    raw_items = json.loads(path.read_text(encoding="utf-8"))
    all_chunks: list[IngestedChunk] = []

    for item in raw_items:
        doc = NormalizedDocument.model_validate(item)
        chunks = chunk_document(doc)
        all_chunks.extend(chunks)

    return all_chunks
