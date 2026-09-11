from web3 import Web3

from app.blockchain.adapters.policy_engine import PolicyEngineAdapter


class AuthorizationService:
    """Application service for blockchain-backed authorization checks."""

    def __init__(self, policy_engine: PolicyEngineAdapter):
        self.policy_engine = policy_engine

    @staticmethod
    def _identifier_hash(value: str) -> bytes:
        """Convert an application identifier into the PolicyEngine bytes32 ID."""
        return Web3.keccak(text=value)

    async def check_access(
        self,
        subject: str,
        resource_id: str,
        action: str,
    ) -> bool:
        """Check whether a subject has permission for a resource/action."""
        resource_hash = self._identifier_hash(resource_id)
        action_hash = self._identifier_hash(action)

        return await self.policy_engine.has_permission(
            subject,
            resource_hash,
            action_hash,
        )
