# Production Deployment

## Required environment

- Node.js 22 or newer
- npm
- Optional Docker environment
- Optional Google Apps Script endpoint
- Optional OpenAI API configuration

## Native deployment

```bash
npm ci
npm run validate
npm run build
npm run start

The production server listens on port 3000 by default.

Docker deployment

Build the image:

docker build \
  -t lumi-airport-hvac-digital-twin .

Run the container:

docker run \
  --rm \
  --name lumi-airport-hvac-digital-twin \
  --env-file .env.local \
  -p 3000:3000 \
  lumi-airport-hvac-digital-twin
Docker Compose
docker compose up \
  --build \
  --detach
Health endpoints
GET /api/health
GET /api/system/readiness
GET /api/system/version
Operating statement

The current deployment operates as a virtual HVAC simulation and digital-twin
platform. It does not directly control physical HVAC equipment.
```
