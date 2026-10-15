from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, Index, Sequence, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.models import Base

# 2^53 + 1: ids start above the largest integer a JavaScript number holds exactly.
PET_ID_START = 9007199254740993

pet_id_seq = Sequence("pet_id_seq", start=PET_ID_START, metadata=Base.metadata)


class Pet(Base):
    __tablename__ = "pet"
    __table_args__ = (
        CheckConstraint("status IN ('available','pending','sold')", name="status"),
        Index("pet_status_idx", "status"),
    )

    id: Mapped[int] = mapped_column(BigInteger, pet_id_seq, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String)
    category_name: Mapped[str | None] = mapped_column(String(50), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
