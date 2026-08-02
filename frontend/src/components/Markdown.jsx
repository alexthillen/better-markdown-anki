import { TypographyStylesProvider, useMantineColorScheme, Table } from '@mantine/core';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Viewer from 'viewerjs';
import 'viewerjs/dist/viewer.css';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm'; // Added for table support
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { createElement as createSyntaxElement, Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
    oneDark,
    oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import ClozeIndexBadge from './ClozeIndexBadge';

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
            return `\n$$\n${processedContent}\n$$\n`;
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

const colorIndexedBlockMath = () => (tree) => {
    const containsIndexedBlock = (node) => (
        node.type === 'element' && node.properties?.dataClozeBlock
        || node.children?.some(containsIndexedBlock)
    );

    const visit = (node) => {
        if (!node.children) return;

        let indexedBlock = false;
        node.children.forEach((child) => {
            if (containsIndexedBlock(child)) {
                indexedBlock = true;
                return;
            }
            if (indexedBlock && child.type === 'text' && !child.value.trim()) return;

            const classes = child.type === 'element' ? child.properties?.className : null;
            if (indexedBlock && Array.isArray(classes) && classes.includes('katex-display')) {
                classes.push('cloze');
            }
            indexedBlock = false;
        });
        node.children.forEach(visit);
    };

    visit(tree);
};

const CLOZE_CODE_MARKER = /BMA_CLOZE_INDEX_(\d+)_/g;

function decorateCodeMarkers(node) {
    if (!node.children) return node;

    return {
        ...node,
        children: node.children.flatMap((child) => {
            if (child.type !== 'text') return [decorateCodeMarkers(child)];

            const parts = [];
            let cursor = 0;
            for (const match of child.value.matchAll(CLOZE_CODE_MARKER)) {
                if (match.index > cursor) {
                    parts.push({ type: 'text', value: child.value.slice(cursor, match.index) });
                }
                parts.push({
                    type: 'element',
                    tagName: 'span',
                    properties: {
                        className: ['bma-cloze-index', 'bma-cloze-code-index'],
                        'aria-label': `Cloze ${match[1]}`,
                    },
                    children: [{ type: 'text', value: match[1] }],
                });
                cursor = match.index + match[0].length;
            }
            if (cursor === 0) return [child];
            if (cursor < child.value.length) {
                parts.push({ type: 'text', value: child.value.slice(cursor) });
            }
            return parts;
        }),
    };
}

const Markdown = ({
    children,
    className = '',
    allowHtml = false,
    sanitize = false, // Control sanitization
    customSanitizeSchema = null, // Allow custom schema
}) => {
    const { colorScheme } = useMantineColorScheme();
    const syntaxTheme = colorScheme === 'dark' ? oneDark : oneLight;

    const containerRef = useRef(null);
    const viewerHostRef = useRef(null);

    const preprocessSpecialCharacters = (content) => {
        // \: --> :
        return content.replace(/\\:/g, ':').replace(/&gt;/g, '>').replace(/&lt;/g, '<');
    };

    // Preprocess HTML breaks to newlines
    const preprocessHtmlBreaks = (content) => {
        return content
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/div>\s*<div[^>]*>/gi, '\n')
            .replace(/<div[^>]*>/gi, '\n')
            .replace(/<\/div>/gi, '')
            .replace(/(&nbsp;)/gi, ' ');
    };

    // Process content with HTML break preprocessing
    const processedContent = (() => {
        let content = allowHtml ? children : decodeHtmlEntities(children);
        content = preprocessHtmlBreaks(content);
        content = preprocessSpecialCharacters(content);
        content = decodeMarkdownMathContent(content);
        return content;
    })();

    useEffect(() => {
        const localContainer = containerRef.current;
        if (!localContainer) return;

        const viewerHost = localContainer.closest('#root-react') || document.getElementById('root-react') || localContainer;
        viewerHostRef.current = viewerHost;

        if (!viewerHost.__bmaViewer) {
            viewerHost.__bmaViewer = {
                refs: 0,
                viewer: new Viewer(viewerHost, {
                    filter: (image) => image.classList?.contains('bma-viewer-img'),
                    navbar: true,
                    toolbar: true,
                    title: true,
                    fullscreen: true,
                    transition: true,
                    zoomable: true,
                    movable: true,
                    rotatable: true,
                    scalable: true,
                    keyboard: true,
                    zIndex: 2147483647,
                }),
            };
        }

        viewerHost.__bmaViewer.refs += 1;
        requestAnimationFrame(() => viewerHost.__bmaViewer?.viewer?.update());

        return () => {
            const state = viewerHost.__bmaViewer;
            if (!state) return;
            state.refs -= 1;
            if (state.refs <= 0) {
                state.viewer.destroy();
                delete viewerHost.__bmaViewer;
            }
        };
    }, []);

    useEffect(() => {
        const viewerHost = viewerHostRef.current;
        const viewer = viewerHost?.__bmaViewer?.viewer;
        if (!viewer) return;
        requestAnimationFrame(() => viewer.update());
    }, [processedContent]);

    const _inlineCodeStyles = {
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
        plugins.push(colorIndexedBlockMath);

        return plugins;
    };

    const handleStringChildrenSpan = (childrenString) => {
        if (childrenString.includes('🪷')) {
            childrenString = childrenString.replace(/🪷/g, '$');
        }
        if (childrenString.includes('\n')) {
            childrenString = childrenString.replace(/\n/g, '<br />');
        }
        return childrenString;
    }

    return (
        <TypographyStylesProvider
            ref={containerRef}
            className={`${className} markdown-content`}
            style={{
                fontSize: '24px',
                lineHeight: '1.4',
            }}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]} // Math and Table support
                rehypePlugins={buildRehypePlugins()}
                components={{
                    span: ({ className, children, 'data-cloze': cloze, 'data-cloze-index': clozeIndex, 'data-ordinal': ordinal, ...props }) => {
                        const indexBadge = clozeIndex ? <ClozeIndexBadge index={clozeIndex} /> : null;


                        if (typeof children === 'string') {
                            children = handleStringChildrenSpan(children);
                            return <span className={className} data-cloze={cloze} data-cloze-index={clozeIndex} data-ordinal={ordinal} {...props}>
                                <span dangerouslySetInnerHTML={{ __html: children }} />
                                {indexBadge}
                            </span>;
                        } else if (Array.isArray(children)) {
                            const processedChildren = children.map((child, index) => {
                                if (typeof child === 'string') {
                                    return <span key={index} dangerouslySetInnerHTML={{ __html: handleStringChildrenSpan(child) }} />;
                                }
                                return child;
                            });
                            return <span className={className} data-cloze={cloze} data-cloze-index={clozeIndex} data-ordinal={ordinal} {...props}>{processedChildren}{indexBadge}</span>;
                        }
                        return <span className={className} data-cloze={cloze} data-cloze-index={clozeIndex} data-ordinal={ordinal} {...props}>{children}{indexBadge}</span>;
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
                        const rawCode = String(decodeHtmlEntities(codeChildren)).replace(/^\n/, '').replace(/\n$/, '');
                        const clozeLines = new Set();
                        rawCode.split('\n').forEach((line, lineIndex) => {
                            for (const _match of line.matchAll(CLOZE_CODE_MARKER)) {
                                clozeLines.add(lineIndex + 1);
                            }
                        });
                        const codeString = rawCode;
                        const isBlock = Boolean(match || codeString.includes('\n'));
                        const highlightedCode = <SyntaxHighlighter
                                style={syntaxTheme}
                                language={(match && match[1]) || 'text'}
                                PreTag={isBlock ? 'div' : 'span'}
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
                                showLineNumbers={clozeLines.size > 0}
                                showInlineLineNumbers={false}
                                lineNumberContainerStyle={{ display: 'none' }}
                                lineProps={(lineNumber) => ({
                                    className: clozeLines.has(lineNumber) ? 'bma-cloze-code-line' : undefined,
                                })}
                                renderer={({ rows, stylesheet, useInlineStyles }) => (
                                    rows.map((row, index) => createSyntaxElement({
                                        node: decorateCodeMarkers(row),
                                        stylesheet,
                                        useInlineStyles,
                                        key: `code-line-${index}`,
                                    }))
                                )}
                                {...props}
                            >
                                {codeString}
                            </SyntaxHighlighter>;

                        return highlightedCode;
                    },
                    img: ({ className: imgClassName, ...props }) => (
                        <img
                            {...props}
                            className={`${imgClassName || ''} bma-viewer-img`.trim()}
                        />
                    ),
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
