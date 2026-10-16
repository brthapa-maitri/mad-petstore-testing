"""create pet table and pet_id_seq

Revision ID: 0001
Revises:
Create Date: 2026-10-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 2^53 + 1: the first id is above the largest integer a JavaScript number holds exactly.
    op.execute("CREATE SEQUENCE pet_id_seq AS BIGINT START WITH 9007199254740993")
    op.create_table(
        "pet",
        sa.Column(
            "id",
            sa.BigInteger(),
            server_default=sa.text("nextval('pet_id_seq')"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("category_name", sa.String(length=50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("status IN ('available','pending','sold')", name="pet_status_check"),
        sa.PrimaryKeyConstraint("id", name="pet_pkey"),
    )
    op.create_index("pet_status_idx", "pet", ["status"])
    op.execute("ALTER SEQUENCE pet_id_seq OWNED BY pet.id")


def downgrade() -> None:
    op.drop_index("pet_status_idx", table_name="pet")
    op.drop_table("pet")
    op.execute("DROP SEQUENCE IF EXISTS pet_id_seq")
