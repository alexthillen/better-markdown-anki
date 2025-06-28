import { TypographyStylesProvider, useMantineColorScheme } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
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
    const entityMap = {
        '&#x27;': "'",
        '&#39;': "'",
        '&apos;': "'",
        '&quot;': '"',
        '&#x22;': '"',
        '&lt;': '<',
        '&gt;': '>',
        '&amp;': '&',
        '&#x2F;': '/',
        '&#x5C;': '\\',
        '&#x60;': '`',
        '&#x3D;': '=',
        '&#35;': '#',
        '&#x23;': '#',
    };

    // Replace named and numeric entities
    let decoded = text;
    Object.entries(entityMap).forEach(([entity, char]) => {
        decoded = decoded.replace(new RegExp(entity, 'g'), char);
    });

    // Handle any remaining numeric entities (decimal)
    decoded = decoded.replace(/&#(\d+);/g, (_match, dec) => {
        return String.fromCharCode(parseInt(dec, 10));
    });

    // Handle any remaining numeric entities (hexadecimal)
    decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (_match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    });

    return decoded;
};

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
    sanitize = true, // Control sanitization
    customSanitizeSchema = null, // Allow custom schema
}) => {
    const { colorScheme } = useMantineColorScheme();
    const syntaxTheme = colorScheme === 'dark' ? oneDark : oneLight;

    // Process content based on HTML allowance
    const processedContent = allowHtml ? children : decodeHtmlEntities(children);

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
        fontSize: '11px',
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
                remarkPlugins={[remarkMath]}
                rehypePlugins={buildRehypePlugins()}
                components={{
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
                        const codeString = String(codeChildren).replace(/^\n/, '').replace(/\n$/, '');
                        return match ? (
                            <SyntaxHighlighter
                                style={syntaxTheme}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{
                                    ...syntaxHighlighterCustomStyle,
                                }}
                                wrapLines
                                {...props}
                            >
                                {codeString}
                            </SyntaxHighlighter>
                        ) : (
                            <code style={inlineCodeStyles} {...props}>
                                {codeChildren}
                            </code>
                        );
                    },
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </TypographyStylesProvider>
    );
};

export default Markdown;
