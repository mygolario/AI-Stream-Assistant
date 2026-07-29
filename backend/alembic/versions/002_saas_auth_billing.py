"""SaaS schema: users, orgs, channels, settings extensions, vector index.

Revision ID: 002
Revises: 001
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("plan", sa.String(length=50), nullable=False, server_default="agency"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_organizations_id", "organizations", ["id"])
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=True),
        sa.Column("display_name", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("avatar_url", sa.String(length=512), nullable=True),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="owner"),
        sa.Column("plan", sa.String(length=50), nullable=False, server_default="free"),
        sa.Column("plan_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("oauth_provider", sa.String(length=50), nullable=True),
        sa.Column("oauth_subject", sa.String(length=255), nullable=True),
        sa.Column("organization_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "organization_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="mod"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "workspace_channels",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("platform", sa.String(length=50), nullable=False),
        sa.Column("channel_id", sa.String(length=200), nullable=False),
        sa.Column("channel_name", sa.String(length=200), nullable=True),
        sa.Column("access_token_encrypted", sa.Text(), nullable=True),
        sa.Column("refresh_token_encrypted", sa.Text(), nullable=True),
        sa.Column("extra_json", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workspace_channels_user_id", "workspace_channels", ["user_id"])

    op.add_column("streamer_settings", sa.Column("user_id", sa.Integer(), nullable=True))
    op.add_column("streamer_settings", sa.Column("youtube_channel_id", sa.String(length=100), nullable=True))
    op.add_column("streamer_settings", sa.Column("kick_token_encrypted", sa.Text(), nullable=True))
    op.add_column("streamer_settings", sa.Column("twitch_token_encrypted", sa.Text(), nullable=True))
    op.add_column("streamer_settings", sa.Column("youtube_token_encrypted", sa.Text(), nullable=True))
    op.add_column("streamer_settings", sa.Column("bot_muted", sa.Boolean(), server_default="false", nullable=False))
    op.add_column(
        "streamer_settings",
        sa.Column("general_knowledge_enabled", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "streamer_settings",
        sa.Column("max_replies_per_minute", sa.Integer(), server_default="10", nullable=False),
    )
    op.add_column("streamer_settings", sa.Column("mention_only", sa.Boolean(), server_default="false", nullable=False))
    op.create_foreign_key(
        "fk_streamer_settings_user_id",
        "streamer_settings",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_streamer_settings_user_id", "streamer_settings", ["user_id"])

    op.execute(
        "ALTER TABLE streamer_settings ALTER COLUMN selected_model SET DEFAULT 'google/gemini-3.5-flash-lite'"
    )
    op.execute(
        "UPDATE streamer_settings SET selected_model = 'google/gemini-3.5-flash-lite'"
    )

    # Optional vector index — skip quietly if extension/data not ready
    op.execute(
        """
        DO $$ BEGIN
          CREATE INDEX IF NOT EXISTS ix_knowledge_base_items_embedding
          ON knowledge_base_items
          USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100);
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Skipping ivfflat index: %', SQLERRM;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_knowledge_base_items_embedding")
    op.drop_constraint("fk_streamer_settings_user_id", "streamer_settings", type_="foreignkey")
    op.drop_index("ix_streamer_settings_user_id", table_name="streamer_settings")
    for col in (
        "user_id",
        "youtube_channel_id",
        "kick_token_encrypted",
        "twitch_token_encrypted",
        "youtube_token_encrypted",
        "bot_muted",
        "general_knowledge_enabled",
        "max_replies_per_minute",
        "mention_only",
    ):
        op.drop_column("streamer_settings", col)
    op.drop_index("ix_workspace_channels_user_id", table_name="workspace_channels")
    op.drop_table("workspace_channels")
    op.drop_table("organization_members")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
    op.drop_index("ix_organizations_slug", table_name="organizations")
    op.drop_index("ix_organizations_id", table_name="organizations")
    op.drop_table("organizations")
