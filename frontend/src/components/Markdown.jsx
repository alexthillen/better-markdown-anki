import { TypographyStylesProvider, useMantineColorScheme, Table } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm'; // Added for table support
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
    oneDark,
    oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

// Function to decode HTML entities
const decodeHtmlEntities = (text) => {
    const textArea = document.createElement('textarea')
    textArea.innerHTML = text
    return textArea.value
}


function decodeMarkdownMathContent(markdownText) {
    // Handle block math: $$...$$ and \[...\]
    const blockMathRegex = /((?<!\\)\$\$([\s\S]*?)(?<!\\)\$\$|\\\[([\s\S]*?)\\\])/g;

    let res = markdownText.replace(blockMathRegex, (match, fullMatch, dollarContent, bracketContent) => {
        let content = dollarContent || bracketContent;
        if (content.endsWith('\\$')) {
            content += ' ';
        }
        let processedContent = content.replace(/<br\s*\/?>/gi, '\n');
        processedContent = decodeHtmlEntities(processedContent);
        if (dollarContent !== undefined) {
            return `$$${processedContent}$$`;
        } else {
            return `\\[${processedContent}\\]`;
        }
    });
    const inlineMathRegex = /((?<!\\)\$((?:[^$\n\\]|\\.)+?)(?<!\\)\$(?!\$)|\\\(([^)]*?)\\\))/g;
    res = res.replace(inlineMathRegex, (match, fullMatch, dollarContent, parenContent) => {
        let content = dollarContent || parenContent;
        let processedContent = content.replace(/<br\s*\/?>/gi, ' ');
        processedContent = processedContent.replace(/\\\$/g, '🪷');
        processedContent = decodeHtmlEntities(processedContent);
        if (dollarContent !== undefined) {
            return `$${processedContent}$`;
        } else {
            return `\\(${processedContent}\\)`;
        }
    });
    return res;
}

// Custom sanitization schema for safe HTML rendering
const createSanitizationSchema = () => {
    return {
        tagNames: [
            // Standard markdown elements
            'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'dl', 'dt', 'dd',
            'blockquote', 'pre', 'code', 'hr',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'a', 'img',
            // Additional HTML elements
            'div', 'span', 'section', 'article', 'aside', 'nav',
            'header', 'footer', 'main', 'figure', 'figcaption',
            'mark', 'small', 'sub', 'sup', 'kbd', 'samp', 'var',
        ],
        attributes: {
            '*': ['className', 'id', 'style'],
            'a': ['href', 'title', 'target', 'rel'],
            'img': ['src', 'alt', 'title', 'width', 'height'],
            'th': ['align', 'colspan', 'rowspan'],
            'td': ['align', 'colspan', 'rowspan'],
            'ol': ['start', 'type'],
            'li': ['value'],
        },
        protocols: {
            href: ['http', 'https', 'mailto', 'tel'],
            src: ['http', 'https', 'data'],
        },
        strip: ['script', 'style', 'iframe', 'object', 'embed'],
        clobberPrefix: 'user-content-',
    };
};

const Markdown = ({
    children,
    className = '',
    allowHtml = false,
    sanitize = false, // Control sanitization
    customSanitizeSchema = null, // Allow custom schema
}) => {
    const { colorScheme } = useMantineColorScheme();
    const syntaxTheme = colorScheme === 'dark' ? oneDark : oneLight;

    const preprocessSpecialCharacters = (content) => {
        // \: --> :
        return content.replace(/\\:/g, ':');
    };

    // Preprocess HTML breaks to newlines
    const preprocessHtmlBreaks = (content) => {
        return content
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<div\s*\/?>/gi, '\n') // TODO : maybe only do this in code blocks?
            .replace(/<\/div>/gi, '\n');
    };

    // Process content with HTML break preprocessing
    const processedContent = (() => {
        let content = allowHtml ? children : decodeHtmlEntities(children);
        content = preprocessHtmlBreaks(content);
        content = preprocessSpecialCharacters(content);
        content = decodeMarkdownMathContent(content);
        return content;
    })();

    const inlineCodeStyles = {
        backgroundColor: colorScheme === 'dark' ? '#2d3748' : '#f7fafc',
        color: colorScheme === 'dark' ? '#e2e8f0' : '#2d3748',
        padding: '2px 4px',
        borderRadius: '4px',
        fontSize: '0.875em',
        fontFamily: 'monospace',
    };

    const syntaxHighlighterCustomStyle = {
        borderRadius: '4px',
        padding: '8px',
        marginTop: '0.5em',
        marginBottom: '0.5em',
    };

    // Build rehype plugins array
    const buildRehypePlugins = () => {
        const plugins = [rehypeKatex];
        if (allowHtml) {
            plugins.push(rehypeRaw);

            if (sanitize) {
                const schema = customSanitizeSchema || createSanitizationSchema();
                plugins.push([rehypeSanitize, schema]);
            }
        }

        return plugins;
    };

    return (
        <TypographyStylesProvider className={`${className} markdown-content`}
            style={{
                fontSize: '24px',
                lineHeight: '1.4',
            }}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]} // Math and Table support
                rehypePlugins={buildRehypePlugins()}
                components={{
                    span: ({ className, children, ...props }) => {
                        if (typeof children === 'string' && children.includes('🪷')) {
                            children = children.replace(/🪷/g, '$')
                        };
                        return <span className={className} {...props}>{children}</span>;
                    },
                    pre: ({ children, ...props }) => {
                        // Return a div instead of pre to avoid double wrapping
                        return <div {...props}>{children}</div>;
                    },
                    code: ({
                        className: codeClassName,
                        children: codeChildren,
                        ...props
                    }) => {
                        const match = /language-(\w+)/.exec(codeClassName || '');
                        const codeString = String(decodeHtmlEntities(codeChildren)).replace(/^\n/, '').replace(/\n$/, '');
                        return (<SyntaxHighlighter
                                style={syntaxTheme}
                                language={(match && match[1]) || 'text'}
                                PreTag={(match || String(codeChildren).includes('\n') ? 'div' : 'span')}
                                customStyle={{
                                    ...syntaxHighlighterCustomStyle,
                                }}
                                codeTagProps={{
                                    style: {
                                        lineHeight: "inherit",
                                        fontSize: "inherit",
                                        backgroundColor: 'inherit',
                                        padding: '0',
                                    }
                                }}
                                wrapLines
                                {...props}
                            >
                                {codeString}
                            </SyntaxHighlighter>);
                    },
                    // Table components using Mantine
                    table: ({ children, ...props }) => (
                        <Table
                            striped
                            highlightOnHover
                            withTableBorder
                            withColumnBorders
                            style={{
                                marginTop: '1em',
                                marginBottom: '1em',
                            }}
                            {...props}
                        >
                            {children}
                        </Table>
                    ),
                    thead: ({ children, ...props }) => (
                        <Table.Thead {...props}>
                            {children}
                        </Table.Thead>
                    ),
                    tbody: ({ children, ...props }) => (
                        <Table.Tbody {...props}>
                            {children}
                        </Table.Tbody>
                    ),
                    tr: ({ children, ...props }) => (
                        <Table.Tr {...props}>
                            {children}
                        </Table.Tr>
                    ),
                    th: ({ children, ...props }) => (
                        <Table.Th {...props}>
                            {children}
                        </Table.Th>
                    ),
                    td: ({ children, ...props }) => (
                        <Table.Td {...props}>
                            {children}
                        </Table.Td>
                    ),
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </TypographyStylesProvider>
    );
};

export default Markdown;
