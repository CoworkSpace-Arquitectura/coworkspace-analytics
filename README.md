# CoworkSpace · Analytics Service

![CI-CD](https://github.com/CoworkSpace-Arquitectura/coworkspace-analytics/actions/workflows/deploy.yml/badge.svg)

Microservicio de analítica. Un ETL que corre cada hora lee reservas, suscripciones, cobros y facturas de los otros servicios y calcula ocupación por sede, ingresos por plan y retención. Si una fuente falla no guarda nada (todo o nada).

- **Despliegue:** https://coworkspace-analytics.onrender.com
- **Documentación de la API (Swagger):** https://coworkspace-analytics.onrender.com/docs
- **Puerto local:** 3008
- **Tolerancia a fallos:** si una fuente no responde, el ETL queda en `FAILED` y se conservan las métricas anteriores

## Tecnologías

TypeScript, NestJS 12 y Node.js 24, Prisma 6 y PostgreSQL, Vitest y Supertest para pruebas, prom-client para métricas y @nestjs/swagger para la documentación. Se empaqueta con Docker.

## Instalación y ejecución local

```bash
npm install
cp .env.example .env        # en Windows: copy .env.example .env
npx prisma migrate dev          # crea las tablas en tu base local
npm run start:dev           # http://localhost:3008
```

Producción: `npm run build` y `node dist/main.js` (o la imagen Docker del `Dockerfile`).

## Variables de entorno

Están en `.env.example`. El archivo `.env` real no se sube al repositorio (está en `.gitignore`); en Render se configuran como variables de entorno y en GitHub Actions como *secrets*.

| Variable | Para qué sirve | Ejemplo |
| --- | --- | --- |
| `DATABASE_URL` | Base de datos PostgreSQL del servicio (en producción: Neon) | `postgresql://postgres:postgres@localhost:5432/coworkspace_analytics` |
| `PORT` | Puerto HTTP | `3008` |
| `SPACE_URL` | Fuentes del ETL | `http://localhost:3001` |
| `MEMBERSHIP_URL` | Fuentes del ETL | `http://localhost:3002` |
| `BOOKING_URL` | Fuentes del ETL | `http://localhost:3004` |
| `BILLING_URL` | Fuentes del ETL | `http://localhost:3005` |

## Base de datos

- PostgreSQL propio del servicio (en producción, una base en Neon). Ningún otro servicio accede a ella.
- Esquema en `prisma/schema.prisma` y 1 migraciones versionadas en `prisma/migrations/`.
- Las migraciones se aplican solas al arrancar el contenedor (`npx prisma migrate deploy`); en local: `npx prisma migrate dev`.
- Datos de ejemplo: las peticiones de `analytics.http` (extensión REST Client de VS Code) crean datos de prueba.
- Respaldo: Neon permite restaurar la base a un punto anterior desde su panel.

## Endpoints

| Método | Ruta |
| --- | --- |
| GET | `/metrics/occupancy` |
| GET | `/metrics/revenue` |
| GET | `/metrics/retention` |
| POST | `/etl/run` |
| GET | `/etl/runs` |
| GET | `/metrics` (métricas para Prometheus) |
| GET | `/docs` (Swagger UI) |

## Pruebas

Pruebas unitarias en `src/**/*.spec.ts` (con mocks de la base, de otros servicios y de las APIs externas) y una prueba de integración en `test/integration/` contra un PostgreSQL y un Redis reales.

```bash
npx vitest run --exclude "test/**"   # solo unitarias, sin base de datos
npm test                              # unitarias + integración (requiere DATABASE_URL)
npm run test:cov                      # con reporte de cobertura (carpeta coverage/)
```

En GitHub Actions las pruebas corren contra PostgreSQL 16 y Redis 7 reales, y el reporte de cobertura queda como artefacto `cobertura-analytics`.

## CI/CD

`.github/workflows/deploy.yml` se ejecuta en cada push y pull request a `main` y llama al workflow reutilizable de [coworkspace-pipelines](https://github.com/CoworkSpace-Arquitectura/coworkspace-pipelines): lint, build, pruebas con cobertura → imagen Docker en GHCR → despliegue en Render. Si una prueba falla, no se construye la imagen ni se despliega. Los pull requests solo corren las pruebas.

## Monitoreo

`GET /metrics` expone métricas para Prometheus (peticiones por ruta y código, histograma de tiempos de respuesta y métricas del proceso). La configuración de Prometheus y el dashboard de Grafana están en `coworkspace-pipelines/monitoring`.
