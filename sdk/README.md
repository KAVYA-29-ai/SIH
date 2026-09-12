# @trustmesh/sdk

Minimal frontend SDK for TrustMesh authorization.

## API

`createTrustMeshClient({ baseUrl })` creates a client with `accessCheck({ orgId, did, resourceId, action, role? })`.

The client calls the existing FastAPI access-check endpoint and returns the backend decision with a normalized `ALLOW` or `DENY` decision.
