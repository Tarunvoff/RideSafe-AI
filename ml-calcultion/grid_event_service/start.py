#!/usr/bin/env python
# Grid Event Service Startup
import os
os.system("uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload")
