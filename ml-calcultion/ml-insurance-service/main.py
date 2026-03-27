from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import risk, pricing, fraud, trigger
import utils.model_loader # This triggers singleton initialization during startup

app = FastAPI(
    title="Aegis ML Microservice",
    description="ML service for risk, pricing, fraud detection, and parametric triggers.",
    version="1.0.0"
)

# CORS middleware for NestJS backend / other services communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(risk.router, tags=["Risk"])
app.include_router(pricing.router, tags=["Pricing"])
app.include_router(fraud.router, tags=["Fraud"])
app.include_router(trigger.router, tags=["Trigger"])

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
