#!/usr/bin/env python
# ML Microservice Startup
import os
os.system("uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload")
