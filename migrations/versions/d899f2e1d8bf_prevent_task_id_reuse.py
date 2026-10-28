"""prevent task id reuse

Revision ID: d899f2e1d8bf
Revises: 144fbb56c5d2
Create Date: 2026-10-26 15:15:00.807040

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd899f2e1d8bf'
down_revision: Union[str, Sequence[str], None] = '144fbb56c5d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    if op.get_bind().dialect.name != "sqlite":
        return
    with op.batch_alter_table(
        "tasks",
        recreate="always",
        table_kwargs={"sqlite_autoincrement": True},
    ):
        pass


def downgrade() -> None:
    """Downgrade schema."""
    if op.get_bind().dialect.name != "sqlite":
        return
    with op.batch_alter_table(
        "tasks",
        recreate="always",
        table_kwargs={"sqlite_autoincrement": False},
    ):
        pass
