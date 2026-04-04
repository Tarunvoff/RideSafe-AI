#!/bin/bash
docker rm -f $(docker ps -aq) 2>/dev/null
cd ~/ridesafe-ai
docker-compose build --no-cache backend
docker-compose up -d
