import React, { useRef, useEffect, useState } from 'react';
import Markdown from './Markdown';
import { Card, Paper, Stack, Text, Switch, Group } from '@mantine/core';
import ClozeToggle from './ClozeToggle';
import ClozeIndexBadge from './ClozeIndexBadge';

function safeDecode(str) {
    try {
        return decodeURIComponent(str || '');
    } catch (e) {
        console.warn('Cloze decoding failed, using raw string:', str);
        return str || '';
    }
}

function removeClozeSpans(htmlString) {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = htmlString;
    const clozeSpans = doc.querySelectorAll('span.cloze, span.cloze-inactive');
    clozeSpans.forEach(span => {
        const index = span.getAttribute('data-cloze-index');
        const marker = index ? `BMA_CLOZE_INDEX_${index}_` : '';
        span.outerHTML = marker + span.innerHTML;
    });
    return doc.body.innerHTML;
}

function replaceCodeContent(markdownText) {
    const codeBlockRegex = /\`\`\`(\w*)([\s\S]*?)\`\`\`/g;
    let res = markdownText.replace(codeBlockRegex, (match, language, content) => {
        let processedContent = content.replace(/<br\s*\/?>/gi, '\n');
        processedContent = removeClozeSpans(processedContent);
        return `\n\`\`\`${language}${processedContent}\`\`\``;
    });

    const inlineCodeRegex = /`([^`\n]+)`/g;
    res = res.replace(inlineCodeRegex, (match, content) => {
        let processedContent = content.replace(/<br\s*\/?>/gi, '\n');
        processedContent = removeClozeSpans(processedContent);
        return `\`${processedContent}\``;
    });
    
    return res;
}

function replaceMarkdownMathContent(markdownText) {
    const blockMathRegex = /(\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\])/g;
    let res = markdownText.replace(blockMathRegex, (match, fullMatch, dollarContent, bracketContent) => {
        let content = dollarContent || bracketContent;
        let processedContent = content.replace(/<br\s*\/?>/gi, '\n');
        processedContent = removeClozeSpans(processedContent);
        if (dollarContent !== undefined) {
            return `$$${processedContent}$$`;
        } else {
            return `\\[${processedContent}\\]`;
        }
    });

    const inlineMathRegex = /((?<!\$)\$([^$\n]+)\$(?!\$)|\\\(([^)]*?)\\\))/g;
    res = res.replace(inlineMathRegex, (match, fullMatch, dollarContent, parenContent) => {
        let content = dollarContent || parenContent;
        let processedContent = content.replace(/<br\s*\/?>/gi, ' ');
        processedContent = removeClozeSpans(processedContent);
        if (dollarContent !== undefined) {
            return `$${processedContent}$`;
        } else {
            return `\\(${processedContent}\\)`;
        }
    });

    return res;
}

// @ts-ignore
const isDev = import.meta.env.DEV;

function ClozeCard(
    {
        frontNode,
        backNode,
        extraNode,
        contentVersion,
        colors
    }: {
        frontNode: HTMLElement | null;
        backNode: HTMLElement | null;
        extraNode: HTMLElement | null;
        contentVersion: number;
        colors: {
            front: { bg: string; border: string };
            back: { bg: string; border: string };
            extra: { bg: string; border: string };
        };
    }
) {
    const containerRef = useRef(null);
    const [clozeCardContent, setClozeCardContent] = useState({
        front: 'Loading...',
        back: 'Loading...',
        extra: 'Loading...'
    });
    const [resetToggle, setResetToggle] = useState(0);
    
    const getBorderStyle = (borderColor) => (theme) => {
        const [colorKey, shadeStr] = borderColor.split('.');
        const shade = parseInt(shadeStr, 10);
        return { border: `1px solid ${theme.colors[colorKey][shade]}` };
    };

    const root = document.getElementById('front-card-cloze');
    const clozeSpans = Array.from(root ? root.querySelectorAll('span.cloze') : []);

    const nodeToMarkdown = (node: HTMLElement | null, indexClozes = false): string => {
        if (!node) return '';
        const content = node.cloneNode(true) as HTMLElement;
        if (indexClozes) {
            content.querySelectorAll('span.cloze').forEach((span, index) => {
                const clozeIndex = String(index + 1);
                const blockHint = span.innerHTML.trim().match(/^\[\s*(\$\$[\s\S]*\$\$|\\\[[\s\S]*\\\])\s*\]$/);
                if (blockHint) {
                    const marker = document.createElement('span');
                    marker.setAttribute('data-cloze-index', clozeIndex);
                    marker.setAttribute('data-cloze-block', 'true');
                    span.replaceWith(marker, document.createTextNode(`\n${blockHint[1]}\n`));
                } else {
                    span.setAttribute('data-cloze-index', clozeIndex);
                }
            });
        }
        const res = replaceCodeContent(content.innerHTML.trim() || '');
        const mathRes = replaceMarkdownMathContent(res);
        return mathRes;
    }

    function symmetricConcat(s1, s2) {
        return [s1, s2].sort().join('');
    }

    useEffect(() => {
        if (clozeCardContent.back !== nodeToMarkdown(backNode)) {
            setResetToggle(prev => prev + 1); 
        }

        setClozeCardContent({
            front: nodeToMarkdown(frontNode, true),
            back: nodeToMarkdown(backNode),
            extra: nodeToMarkdown(extraNode)
        });
    }, [frontNode, backNode, extraNode, contentVersion]);

    return (
        <div ref={containerRef}>
            <Stack gap="md">
                {/* Front section */}
                {clozeCardContent.front && (<div>
                    <Text fw={600} size="lg" mb="xs" c="dimmed">
                        FRONT
                    </Text>
                    <Group mb="xs">
                        {clozeSpans.length > 0 && (
                            clozeSpans.map((span, index) => (
                                <ClozeToggle 
                                    key={index} 
                                    spanElement={span} 
                                    label={<span className="bma-cloze-toggle-label">Cloze <ClozeIndexBadge index={index + 1} ariaHidden /></span>}
                                    text={symmetricConcat(
                                        safeDecode(span.getAttribute('data-cloze')), 
                                        span.innerHTML
                                    )} 
                                />
                            ))
                        )}
                    </Group>

                    <Paper
                        p="md"
                        bg={colors.front.bg}
                        style={(theme) => ({
                            ...getBorderStyle(colors.front.border)(theme),
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            overflowX: 'auto'
                        })}
                        radius="sm"
                    >
                        <Markdown allowHtml={true}>{clozeCardContent.front}</Markdown>
                    </Paper>
                </div>)}

                {/* Back section */}
                {clozeCardContent.back && (<div>
                    <Text fw={600} size="lg" mb="xs" c="dimmed">
                        BACK
                    </Text>
                    <Paper
                        p="md"
                        bg={colors.back.bg}
                        style={(theme) => ({
                            ...getBorderStyle(colors.back.border)(theme),
                            overflowX: 'auto'
                        })}
                        radius="sm"
                    >
                        <Markdown allowHtml={true}>{clozeCardContent.back}</Markdown>
                    </Paper>
                </div>)}

                {clozeCardContent.extra && (<div>
                    <Text fw={600} size="lg" mb="xs" c="dimmed">
                        EXTRA
                    </Text>
                    <Paper
                        p="md"
                        bg={colors.extra.bg}
                        style={(theme) => ({
                            ...getBorderStyle(colors.extra.border)(theme),
                            overflowX: 'auto'
                        })}
                        radius="sm"
                    >
                        <Markdown allowHtml={true}>{clozeCardContent.extra}</Markdown>
                    </Paper>
                </div>)}
            </Stack>
        </div>
    )
}

export default ClozeCard;
