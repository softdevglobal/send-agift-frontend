# syntax=docker/dockerfile:1

# SendAGift web app image: the Vite build served by nginx.
#
# By default the app calls the API on its own origin (/api/v1), and nginx
# forwards /api, /health and /version to API_UPSTREAM, so one image works
# for any environment, with only the upstream changing at run time.
#
# To bake in an API on another domain instead, build with:
#   docker build --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 .

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.29-alpine

ARG GIT_SHA=dev
LABEL org.opencontainers.image.title="sendagift-web" \
      org.opencontainers.image.revision="${GIT_SHA}"

# The official image fills in ${API_UPSTREAM} from the environment at start.
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

ENV API_UPSTREAM=http://api:8080
EXPOSE 80
