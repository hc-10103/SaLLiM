# 레포 루트에서 빌드 (data/를 같이 넣기 위해):
#   docker build -t sallim-api .
#   docker run -p 8000:8000 --env-file server/.env sallim-api
FROM python:3.12-slim
WORKDIR /srv
COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt
COPY server/app server/app
COPY data data
ENV SALLIM_DATA_DIR=/srv/data VISION_PROVIDER=mock PYTHONUNBUFFERED=1
WORKDIR /srv/server
EXPOSE 8000
# PaaS가 PORT를 주면 그걸 쓴다
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
