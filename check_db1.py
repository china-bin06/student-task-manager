# 验证数据库连接的脚本
from sqlalchemy import text
from app.database import engine

# 尝试连接数据库并执行简单查询
# engine.connect():从连接池中借出一个连接,返回一个 Connection 对象
# with ... as connection::用上下文管理器管理连接的生命周期,即使抛异常也能保证连接释放,不会耗尽连接池。
with engine.connect() as connection: 
    # text()把字符串变成一个 TextClause 对象, SQLAlchemy 才能知道这是一条 SQL 语句,
    result = connection.execute(text("SELECT 1"))
    print(result.scalar())  # scalar()返回结果集中的第一行第一列的值        

# 运行此脚本,如果输出 1,说明数据库连接正常,否则说明数据库连接有问题。
# SELECT 后面不一定非得跟列名,也可以跟表达式/常量。SELECT 1 的意思是"计算表达式 1,把它作为一列返回",不需要 FROM