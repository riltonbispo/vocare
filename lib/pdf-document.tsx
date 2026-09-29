import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { marked, type Token, type Tokens } from "marked";

const styles = StyleSheet.create({
  resumePage: {
    paddingTop: 42,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.5,
    color: "#1f1f1f",
  },
  headingOne: {
    fontSize: 21,
    lineHeight: 1.2,
    fontWeight: 700,
    marginBottom: 3,
  },
  headingTwo: {
    fontSize: 11.25,
    lineHeight: 1.3,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6b6b6b",
    marginTop: 20,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  headingThree: {
    fontSize: 12,
    lineHeight: 1.3,
    fontWeight: 600,
    marginTop: 12,
    marginBottom: 2,
  },
  paragraph: {
    marginVertical: 3,
    color: "#3a3a3a",
  },
  list: {
    marginVertical: 4,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 1.5,
  },
  bullet: {
    width: 17,
    color: "#3a3a3a",
  },
  listItemContent: {
    flexGrow: 1,
    flexBasis: 0,
    color: "#3a3a3a",
  },
  listParagraph: {
    marginBottom: 2,
  },
  horizontalRule: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    marginVertical: 13,
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: "#d4d4d4",
    paddingLeft: 10,
    marginVertical: 5,
    color: "#555555",
  },
  code: {
    fontFamily: "Courier",
    fontSize: 9,
    backgroundColor: "#f5f5f5",
    padding: 6,
    marginVertical: 4,
  },
  table: {
    marginVertical: 5,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#d4d4d4",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableCell: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 4,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#d4d4d4",
  },
  tableHeader: {
    fontWeight: 700,
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
  },
  coverLetterPage: {
    paddingTop: 54,
    paddingBottom: 54,
    paddingHorizontal: 57,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.75,
    color: "#262626",
  },
  coverLetterParagraph: {
    marginBottom: 11,
  },
});

function renderInline(tokens: Token[], keyPrefix: string): ReactNode[] {
  return tokens.map((token, index) => {
    const key = keyPrefix + "-" + index;

    switch (token.type) {
      case "strong":
        return (
          <Text key={key} style={{ fontWeight: 700 }}>
            {renderInline(token.tokens, key)}
          </Text>
        );
      case "em":
        return (
          <Text key={key} style={{ fontStyle: "italic" }}>
            {renderInline(token.tokens, key)}
          </Text>
        );
      case "del":
        return (
          <Text key={key} style={{ textDecoration: "line-through" }}>
            {renderInline(token.tokens, key)}
          </Text>
        );
      case "codespan":
        return (
          <Text key={key} style={{ fontFamily: "Courier", fontSize: 9 }}>
            {token.text}
          </Text>
        );
      case "link":
        return (
          <Link key={key} src={token.href} style={styles.link}>
            {renderInline(token.tokens, key)}
          </Link>
        );
      case "image":
        return token.text;
      case "br":
        return "\n";
      case "checkbox":
        return token.checked ? "[x] " : "[ ] ";
      case "text":
        return token.tokens
          ? renderInline(token.tokens, key)
          : token.text;
      case "escape":
        return token.text;
      default:
        return "text" in token ? token.text : "";
    }
  });
}

function renderListItem(item: Tokens.ListItem, key: string): ReactNode[] {
  return item.tokens.map((token, index) => {
    const tokenKey = key + "-content-" + index;

    if (token.type === "text") {
      return (
        <Text key={tokenKey} style={styles.listParagraph}>
          {token.tokens
            ? renderInline(token.tokens, tokenKey)
            : token.text}
        </Text>
      );
    }

    if (token.type === "paragraph") {
      return (
        <Text key={tokenKey} style={styles.listParagraph}>
          {renderInline(token.tokens, tokenKey)}
        </Text>
      );
    }

    if (token.type === "space") return null;

    return renderBlock(token, tokenKey);
  });
}

function renderList(list: Tokens.List, key: string): ReactNode {
  const firstNumber = typeof list.start === "number" ? list.start : 1;

  return (
    <View key={key} style={styles.list}>
      {list.items.map((item, index) => {
        const marker = item.task
          ? item.checked
            ? "[x]"
            : "[ ]"
          : list.ordered
            ? String(firstNumber + index) + "."
            : "•";

        return (
          <View key={key + "-item-" + index} style={styles.listItem}>
            <Text style={styles.bullet}>{marker}</Text>
            <View style={styles.listItemContent}>
              {renderListItem(item, key + "-item-" + index)}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function renderTable(table: Tokens.Table, key: string): ReactNode {
  const rows = [table.header, ...table.rows];

  return (
    <View key={key} style={styles.table}>
      {rows.map((row, rowIndex) => (
        <View key={key + "-row-" + rowIndex} style={styles.tableRow}>
          {row.map((cell, cellIndex) => (
            <Text
              key={key + "-row-" + rowIndex + "-cell-" + cellIndex}
              style={[
                styles.tableCell,
                ...(cell.header ? [styles.tableHeader] : []),
                ...(cell.align ? [{ textAlign: cell.align }] : []),
              ]}
            >
              {renderInline(cell.tokens, key + "-" + rowIndex + "-" + cellIndex)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function renderBlock(token: Token, key: string): ReactNode {
  switch (token.type) {
    case "heading": {
      const headingStyle =
        token.depth === 1
          ? styles.headingOne
          : token.depth === 2
            ? styles.headingTwo
            : styles.headingThree;

      return (
        <Text key={key} style={headingStyle} minPresenceAhead={12}>
          {renderInline(token.tokens, key)}
        </Text>
      );
    }
    case "paragraph":
      return (
        <Text key={key} style={styles.paragraph}>
          {renderInline(token.tokens, key)}
        </Text>
      );
    case "list":
      return renderList(token, key);
    case "hr":
      return <View key={key} style={styles.horizontalRule} />;
    case "blockquote":
      return (
        <View key={key} style={styles.blockquote}>
          {renderBlocks(token.tokens, key)}
        </View>
      );
    case "code":
      return (
        <Text key={key} style={styles.code}>
          {token.text}
        </Text>
      );
    case "table":
      return renderTable(token, key);
    case "html":
      return (
        <Text key={key} style={styles.paragraph}>
          {token.text.replace(/<[^>]*>/g, "")}
        </Text>
      );
    case "space":
      return null;
    default:
      return "text" in token ? token.text : null;
  }
}

function renderBlocks(tokens: Token[], keyPrefix: string): ReactNode[] {
  return tokens.map((token, index) =>
    renderBlock(token, keyPrefix + "-" + index),
  );
}

export function createResumePdf(markdown: string) {
  const tokens = marked.lexer(markdown, { breaks: true });

  return (
    <Document title="Currículo" language="pt-BR">
      <Page size="A4" style={styles.resumePage}>
        {renderBlocks(tokens, "resume")}
      </Page>
    </Document>
  );
}

export function createCoverLetterPdf(content: string) {
  const paragraphs = content
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean);

  return (
    <Document title="Carta de apresentação" language="pt-BR">
      <Page size="A4" style={styles.coverLetterPage}>
        {paragraphs.map((paragraph, index) => (
          <Text key={"letter-" + index} style={styles.coverLetterParagraph}>
            {paragraph}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

