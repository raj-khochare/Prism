import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()


def _database_url():
    """Prefer discrete DB_* parts: URL.create() escapes any character in the password.
    A password containing '@', ':' or '/' inside a DATABASE_URL string breaks host parsing
    (-> "Name or service not known")."""
    if os.getenv("DB_HOST"):
        return URL.create(
            "postgresql+psycopg",
            username=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT", "5432")),
            database=os.getenv("DB_NAME", "prism_static_analyzer"),
        )
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("Set DB_HOST/DB_USER/DB_PASSWORD or DATABASE_URL")
    return url


class Base(DeclarativeBase):
    pass


engine = create_engine(_database_url(), pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
