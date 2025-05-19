---
url: "https://docs.arcade.dev/home/build-tools/create-a-tool-with-secrets"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Build tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit "Build tools") Create a tool with secrets

# Adding secrets to your tools

In this guide, you’ll learn how to add secrets to your custom tools, using Arcade.

Secrets are sensitive strings like passwords, api-keys, or other tokens that grant access to a protected resource or API.

In this example, you’ll create a tool that reads data from a postgres database.

### Prerequisites [Permalink for this section](https://docs.arcade.dev/home/build-tools/create-a-tool-with-secrets\#prerequisites)

- [Set up Arcade](https://docs.arcade.dev/home/quickstart)
- [Understand Tool Context](https://docs.arcade.dev/home/build-tools/tool-context)

We will be using `sqlalchemy` and `psycopg2-binary` to access a postgres database.

```nextra-code
pip install arcade-ai sqlalchemy psycopg2-binary
```

### Define your tool [Permalink for this section](https://docs.arcade.dev/home/build-tools/create-a-tool-with-secrets\#define-your-tool)

Create a new Python file, e.g., `sql_tools.py`, and import the necessary modules:

```nextra-code
from typing import Annotated
from sqlalchemy import create_engine,Engine,inspect,text
from arcade.sdk import tool, ToolContext
```

Now, define your tool using the `@tool` decorator and specify the needed secrets with `requires_secrets`, in this case a `DATABASE_CONNECTION_STRING`. In this example, `DATABASE_CONNECTION_STRING`, is meant to be a JDBC-style database connection URL, e.g. `postgres://user:password@hostname.com/database_name`. Our `DATABASE_CONNECTION_STRING` will contain a username and password in this case, making it very sensitive.

```nextra-code
@tool(requires_secrets=["DATABASE_CONNECTION_STRING"])
def discover_tables(context: ToolContext, schema_name: Annotated[str, "The database schema to discover tables in"] = "public") -> list[str]:
    """Discover all the tables in the database"""
    engine = _get_engine(context.get_secret("DATABASE_CONNECTION_STRING"))
    tables = _get_tables(engine, schema_name)
    return tables


@tool(requires_secrets=["DATABASE_CONNECTION_STRING"])
def get_table_schema(context: ToolContext, schema_name: Annotated[str, "The database schema to get the table schema of"], table_name: Annotated[str, "The table to get the schema of"]) -> list[str]:
    """Get the schema of a table"""
    engine = _get_engine(context.get_secret("DATABASE_CONNECTION_STRING"))
    return _get_table_schema(engine, schema_name, table_name)


@tool(requires_secrets=["DATABASE_CONNECTION_STRING"])
def execute_query(context: ToolContext, query: Annotated[str, "The SQL query to execute"]) -> list[str]:
    """Execute a query and return the results"""
    engine = _get_engine(context.get_secret("DATABASE_CONNECTION_STRING"))
    return _execute_query(engine, query)


def _get_engine(connection_string: str) -> Engine:
    """Get a connection to the database.  Note that we build the engine with an isolation level of READ UNCOMMITTED to prevent all writes."""
    return create_engine(connection_string, isolation_level='READ UNCOMMITTED')


def _get_tables(engine: Engine, schema_name: str) -> list[str]:
    """Get all the tables in the database"""
    inspector = inspect(engine)
    schemas = inspector.get_schema_names()
    tables = []
    for schema in schemas:
        if schema == schema_name:
            tables.extend(inspector.get_table_names(schema=schema))
    return tables

def _get_table_schema(engine: Engine, schema_name: str, table_name: str) -> list[str]:
    """Get the schema of a table"""
    inspector = inspect(engine)
    columns_table = inspector.get_columns(table_name, schema_name)
    return [f"{column['name']}: {column['type'].python_type.__name__}" for column in columns_table]

def _execute_query(engine: Engine, query: str) -> list[str]:
    """Execute a query and return the results."""
    with engine.connect() as connection:
        result = connection.execute(text(query))
        return [str(row) for row in result.fetchall()]
```

### Use your tool with Arcade [Permalink for this section](https://docs.arcade.dev/home/build-tools/create-a-tool-with-secrets\#use-your-tool-with-arcade)

Now you can use your custom authorized tool with Arcade in your application.

Here’s an example of how to use your tool. Note that for this example, the table schema includes a `users` table and a `messages` table, and `messsages` has a foreign key back to `users`.

See full schema

```nextra-code
CREATE TABLE "public"."users" (
    "id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "public"."messages" (
    "id" serial PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"user_id" integer NOT NULL REFERENCES "public"."users" (id),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
```

```nextra-code
import Arcade from "@arcadeai/arcadejs";
import OpenAI from 'openai';

const ARCADE_API_KEY = process.env.ARCADE_API_KEY;
const OPEN_AI_API_KEY = process.env.OPENAI_API_KEY;
const USER_ID = process.env.USER_ID;
const DB_DIALECT = "POSTGRES";
const SCHEMA_NAME = "public";

const SYSTEM_PROMPT = `
You are an expert SQL analyst.
For all questions, you will use only the information provided to you to answer the question, and no prior knowledge.
The SQL dialect is "${DB_DIALECT}".
ONLY RESPOND WITH A SQL STATEMENT AND NOTHING ELSE, ALL ON A SINGLE LINE.  DO NOT EXPLAIN THE SQL STATEMENT.  DO NOT FORMAT THE SQL STATEMENT IN MARKDOWN.  DO NOT ADD ANYTHING ELSE TO THE RESPONSE.
`;

const ArcadeClient = new Arcade({
  apiKey: ARCADE_API_KEY,
});

const OpenAIClient = new OpenAI({
  apiKey: OPEN_AI_API_KEY
});

const sqlTools = await ArcadeClient.tools.formatted.list({
  format: "openai",
  toolkit: "sql",
});

console.log("⚙️ Found the following tools:");
sqlTools.items.forEach((tool) => {
  // @ts-ignore
  console.log(`${tool.function.name}: ${tool.function.description}`);
});

const response = await ArcadeClient.tools.execute({
  tool_name: "Sql.DiscoverTables",
  user_id: USER_ID,
  input: {
    schema_name: SCHEMA_NAME,
  },
});
const tables = response.output?.value as string[]
console.log(`\r\n[🔍] Discovered the following tables: ${tables.join(', ')}`);

const schemas: Record<string, any> = {};
for (const table of tables) {
  const response = await ArcadeClient.tools.execute({
    tool_name: "Sql.GetTableSchema",
    user_id: USER_ID,
    input: {
      schema_name: SCHEMA_NAME,
      table_name: table,
    },
  });
  const schema = response.output?.value as string;
  schemas[table]= schema;
  console.log(`[📜] Schema for ${table}: ${schema}`);
}


// /* --- EXAMPLES --- */
await buildQueryAndExecute("Get the first 10 users's IDs and Names", schemas);
await buildQueryAndExecute("Who has sent the most chat messages?", schemas);

// /* --- UTILITIES --- */
async function buildQueryAndExecute(q: string, schemas: Record<string, any>): Promise<void> {
  console.log(`\r\n[❓] Asking: ${q}`);

  const SQLQuestion = `
  What would be the best SQL query to answer the following question:

  ---
  ${q}
  ---

  The database schema is:
  ${JSON.stringify(schemas, null, 2)}
  `;

  const sql_statement = await OpenAIClient.chat.completions.create({
    model: "gpt-4o",
    messages: [\
      {\
        role: "system",\
        content: SYSTEM_PROMPT,\
      },\
      {\
        role: "user",\
        content: SQLQuestion,\
      }\
    ]})

  const sql = sql_statement.choices[0].message.content?.trim();
  console.log(`[📝] SQL statement: ${sql}`);

  const response = await ArcadeClient.tools.execute({
    tool_name: "Sql.ExecuteQuery",
    user_id: USER_ID,
    input: {
      schema_name: SCHEMA_NAME,
      query: sql,
    },
  });

  console.log(response.output?.value);
}
```

You’ll get a response like this:

```nextra-code
⚙️ Found the following tools:
Sql_DiscoverTables: Discover all the tables in the database
Sql_ExecuteQuery: Execute a query and return the results
Sql_GetTableSchema: Get the schema of a table

[🔍] Discovered the following tables: users, messages
[📜] Schema for users: id: int,name: str,email: str,password_hash: str,created_at: datetime,updated_at: datetime
[📜] Schema for messages: id: int,body: str,user_id: int,created_at: datetime,updated_at: datetime


[❓] Asking: Get the first 10 users's IDs and Names
[📝] SQL statement: SELECT id, name FROM users ORDER BY id LIMIT 10;
[ "(1, 'Sam')", "(3, 'Evan')", "(12, 'Wils')" ]

[❓] Asking: Who has sent the most chat messages?
[📝] SQL statement: SELECT u.name, COUNT(m.id) AS message_count FROM users u JOIN messages m ON u.id = m.user_id GROUP BY u.name ORDER BY message_count DESC LIMIT 1;
[ "('Evan', 218)" ]
```

### Supplying the Secret [Permalink for this section](https://docs.arcade.dev/home/build-tools/create-a-tool-with-secrets\#supplying-the-secret)

Note how in the example above we never provided a value for `DATABASE_CONNECTION_STRING`. This is because we want the Arcade engine to manage this for us, keeping the sercets that the tool needs seperate from the environment that is exceuting the LLM calls (our application above).

Using Arcade Cloud, after publishing your tool with [`arcade deploy`](https://docs.arcade.dev/home/serve-tools/arcade-deploy), you will see that your tool requires the `DATABASE_CONNECTION_STRING` secret:

![An image showing how the Arcade UI displays that our new SQL tools require a secret now](https://docs.arcade.dev/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsecrets-dashboard-1.86602294.png&w=3840&q=75&dpl=dpl_6bU7dXyJRQLPX1ttd6igqrc7nhwY)

You can manage your secrets from the [`secrets` section](https://api.arcade.dev/dashboard/auth/secrets) of the authentication section:

![An image showing how the Arcade UI allows users to manage secrets](https://docs.arcade.dev/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsecrets-dashboard-2.eb90edeb.png&w=3840&q=75&dpl=dpl_6bU7dXyJRQLPX1ttd6igqrc7nhwY)

[Create a tool with auth](https://docs.arcade.dev/home/build-tools/create-a-tool-with-auth "Create a tool with auth") [Handle tool errors](https://docs.arcade.dev/home/build-tools/handle-tool-errors "Handle tool errors")

![An image showing how the Arcade UI displays that our new SQL tools require a secret now](https://docs.arcade.dev/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsecrets-dashboard-1.86602294.png&w=3840&q=75&dpl=dpl_6bU7dXyJRQLPX1ttd6igqrc7nhwY)

![An image showing how the Arcade UI allows users to manage secrets](https://docs.arcade.dev/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsecrets-dashboard-2.eb90edeb.png&w=3840&q=75&dpl=dpl_6bU7dXyJRQLPX1ttd6igqrc7nhwY)