"""initial_schema

Revision ID: 001
Revises: 
Create Date: 2026-07-29 15:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # Personas table
    op.create_table(
        'personas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('system_prompt', sa.Text(), nullable=False),
        sa.Column('temperature', sa.Float(), nullable=False, server_default="0.7"),
        sa.Column('is_preset', sa.Boolean(), nullable=False, server_default="false"),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_personas_id'), 'personas', ['id'], unique=False)

    # Streamer Settings table
    op.create_table(
        'streamer_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('openrouter_api_key', sa.String(length=255), nullable=True),
        sa.Column('selected_model', sa.String(length=100), nullable=False, server_default="google/gemini-2.0-flash-001"),
        sa.Column('active_persona_id', sa.Integer(), nullable=True),
        sa.Column('custom_prompt_override', sa.Text(), nullable=True),
        sa.Column('kick_channel_id', sa.String(length=100), nullable=True),
        sa.Column('twitch_channel_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['active_persona_id'], ['personas.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_streamer_settings_id'), 'streamer_settings', ['id'], unique=False)

    # Knowledge Base Items table
    op.create_table(
        'knowledge_base_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False, server_default="faq"),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(1536), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_base_items_id'), 'knowledge_base_items', ['id'], unique=False)

    # Analytics Logs table
    op.create_table(
        'analytics_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('message_count', sa.Integer(), nullable=False, server_default="0"),
        sa.Column('filtered_count', sa.Integer(), nullable=False, server_default="0"),
        sa.Column('ai_response_count', sa.Integer(), nullable=False, server_default="0"),
        sa.Column('estimated_tokens_saved', sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_analytics_logs_id'), 'analytics_logs', ['id'], unique=False)
    op.create_index(op.f('ix_analytics_logs_timestamp'), 'analytics_logs', ['timestamp'], unique=False)

    # Chat Messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('platform', sa.String(length=50), nullable=False, server_default="simulator"),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_ai_response', sa.Boolean(), nullable=False, server_default="false"),
        sa.Column('is_filtered', sa.Boolean(), nullable=False, server_default="false"),
        sa.Column('tokens_used', sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chat_messages_id'), 'chat_messages', ['id'], unique=False)
    op.create_index(op.f('ix_chat_messages_timestamp'), 'chat_messages', ['timestamp'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_chat_messages_timestamp'), table_name='chat_messages')
    op.drop_index(op.f('ix_chat_messages_id'), table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_index(op.f('ix_analytics_logs_timestamp'), table_name='analytics_logs')
    op.drop_index(op.f('ix_analytics_logs_id'), table_name='analytics_logs')
    op.drop_table('analytics_logs')
    op.drop_index(op.f('ix_knowledge_base_items_id'), table_name='knowledge_base_items')
    op.drop_table('knowledge_base_items')
    op.drop_index(op.f('ix_streamer_settings_id'), table_name='streamer_settings')
    op.drop_table('streamer_settings')
    op.drop_index(op.f('ix_personas_id'), table_name='personas')
    op.drop_table('personas')
