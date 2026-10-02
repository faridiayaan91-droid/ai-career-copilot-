from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import pymysql
import ssl

pymysql.install_as_MySQLdb()

DATABASE_URL = "mysql+pymysql://qWPL4sMuZ2gmc77.root:Q3toL2KRMk4ZrWxN@gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com:4000/test"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={
        "ssl": {"ca": None, "check_hostname": False}
    }
)

SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()