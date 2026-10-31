# @nagarsathi/database

Database schemas, AES-256-GCM encryption utilities, seed data, and service catalog JSON definitions for NagarSathi (CITY-02).

## Purpose
- Defines Mongoose/database schemas for citizens, cases, documents, audit logs, and call transcripts.
- Stores the declarative JSON service catalogs for Pension Restoration, Scholarship Application, and Ration Card Update.
- Implements AES-256-GCM encryption at rest and last-4 masking helpers for sensitive citizen identifiers.
