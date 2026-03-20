#!/usr/bin/env python
# Pricing Engine Startup
import os
os.system("uvicorn app.main:app --host 127.0.0.1 --port 8003 --reload")
