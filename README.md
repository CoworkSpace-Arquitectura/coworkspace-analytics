# CoworkSpace · Analytics Service

![CI-CD](https://github.com/CoworkSpace-Arquitectura/coworkspace-analytics/actions/workflows/deploy.yml/badge.svg)

Microservicio de métricas. Ejecuta un ETL cada hora: extrae datos de solo lectura de Space, Booking, Membership y Billing (por sus endpoints GET), calcula ocupación por sede, ingresos por plan y retención por cohorte, y los carga en su propia base de datos dentro de una transacción.

- **Endpoints:** `/metrics/occupancy`, `/metrics/revenue`, `/metrics/retention`, `POST /etl/run`, `/etl/runs`
- **Puerto local:** 3008
- **Tolerancia a fallos:** si una fuente no responde, el ETL queda en `FAILED` y se conservan las métricas anteriores

## Documentación de la API

- Swagger UI desplegado: https://coworkspace-analytics.onrender.com/docs
- En local: http://localhost:<PUERTO>/docs (el JSON OpenAPI está en `/docs-json`).
