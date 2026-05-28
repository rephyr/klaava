dev-backend:
	cd backend && . .venv/bin/activate && uvicorn main:app --reload

dev-frontend:
	cd frontend && npm run dev

test-backend:
	cd backend && . .venv/bin/activate && python -m pytest -v

test-frontend:
	cd frontend && npm test

test:
	cd backend && . .venv/bin/activate && python -m pytest -v
	cd frontend && npm test

clean:
	find backend -type d -name __pycache__ -exec rm -rf {} +
	find backend -type d -name .pytest_cache -exec rm -rf {} +
	rm -f backend/testKlaava.db
