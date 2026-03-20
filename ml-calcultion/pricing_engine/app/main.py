from fastapi import FastAPI
from app.api.pricing_routes import router as pricing_router
from app.api.payout_routes import router as payout_router
import uvicorn

app = FastAPI(
    title="Pricing Engine Microservice",
    description="Dynamic Pricing and Opportunity Cost Engine for RideSafe-AI",
    version="1.0.0"
)

app.include_router(pricing_router)
app.include_router(payout_router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8003, reload=True)
