from typing import Any

from app.blockchain.client import BlockchainClient


class PolicyEngineAdapter:
    """Backend adapter for the TrustMesh PolicyEngine contract."""

    CONTRACT_NAME = "policy_engine"

    def __init__(self, client: BlockchainClient) -> None:
        self.client = client

    def _contract_config(self):
        return self.client.require_contract(self.CONTRACT_NAME)

    async def get_user_role(self, subject: str) -> bytes:
        """Return the role assigned to an address."""
        return await self.client.call(
            self._contract_config(),
            "getUserRole",
            subject,
        )

    async def get_role(self, role_id: bytes) -> Any:
        """Return role existence and metadata."""
        return await self.client.call(
            self._contract_config(),
            "getRole",
            role_id,
        )

    async def has_permission(
        self,
        subject: str,
        resource_id: bytes,
        action_id: bytes,
    ) -> bool:
        """Perform a read-only permission check."""
        return bool(
            await self.client.call(
                self._contract_config(),
                "hasPermission",
                subject,
                resource_id,
                action_id,
            )
        )

    async def check_access(
        self,
        subject: str,
        resource_id: bytes,
        action_id: bytes,
    ) -> Any:
        """
        Execute the PolicyEngine access-check transaction.

        This function is intentionally not treated as a read-only call because
        the Solidity contract records AccessGranted/AccessDenied audit events.
        """
        contract_config = self._contract_config()
        contract = self.client.contract(contract_config)

        return getattr(contract.functions, "checkAccess")(
            subject,
            resource_id,
            action_id,
        )
