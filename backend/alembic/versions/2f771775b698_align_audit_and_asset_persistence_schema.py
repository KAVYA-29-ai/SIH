"""align audit and asset persistence schema

Revision ID: 2f771775b698
Revises: 535447724444
Create Date: 2026-09-11
"""

from alembic import op
import sqlalchemy as sa


revision = "2f771775b698"
down_revision = "535447724444"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "audit_events",
        sa.Column("contract_address", sa.String(42), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("audit_events", "contract_address")
