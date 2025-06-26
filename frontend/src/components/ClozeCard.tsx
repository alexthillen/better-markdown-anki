import React, { useRef } from 'react'
import { useEffect, useState } from 'react';
import Markdown from './Markdown'
import { Card, Paper, Stack, Text, Switch, Group } from '@mantine/core';
import ClozeToggle from './ClozeToggle';

function removeClozeSpans(htmlString) {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = htmlString;

    // Find all spans with class "cloze"
    const clozeSpans = doc.querySelectorAll('span.cloze');

    clozeSpans.forEach(span => {
        // Replace the span with its content (unwrap)
        span.outerHTML = span.innerHTML;
    });

    // Return the modified HTML
    let res = doc.body.innerHTML;
    return res;
}

function replaceCodeBlockContent(markdownText) {
    const codeBlockRegex = /\`\`\`(\w+)([\s\S]*?)\`\`\`/g;

    let res = markdownText.replace(codeBlockRegex, (match, language, content) => {
        let processedContent = content.replace(/<br\s*\/?>/gi, '\n');
        processedContent = removeClozeSpans(processedContent);
        return `\n\`\`\`${language}${processedContent}\`\`\``;
    });

    return res;
}

function replaceMarkdownMathContent(markdownText) {
    // Handle block math: $$...$$ and \[...\]
    const blockMathRegex = /(\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\])/g;

    let res = markdownText.replace(blockMathRegex, (match, fullMatch, dollarContent, bracketContent) => {
        let content = dollarContent || bracketContent;
        let processedContent = content.replace(/<br\s*\/?>/gi, '\n');
        processedContent = removeClozeSpans(processedContent);

        // Preserve original delimiter style
        if (dollarContent !== undefined) {
            return `$$${processedContent}$$`;
        } else {
            return `\\[${processedContent}\\]`;
        }
    });

    // Handle inline math: $...$ and \(...\)
    const inlineMathRegex = /((?<!\$)\$([^$\n]+)\$(?!\$)|\\\(([^)]*?)\\\))/g;

    res = res.replace(inlineMathRegex, (match, fullMatch, dollarContent, parenContent) => {
        let content = dollarContent || parenContent;
        let processedContent = content.replace(/<br\s*\/?>/gi, ' ');
        processedContent = removeClozeSpans(processedContent);

        // Preserve original delimiter style
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
    const getBorderStyle = (borderColor) => (theme) => {
        const [colorKey, shadeStr] = borderColor.split('.');
        const shade = parseInt(shadeStr, 10);
        return { border: `1px solid ${theme.colors[colorKey][shade]}` };
    };
    const root = document.getElementById('front-card-cloze');
    const clozeSpans = Array.from(root ? root.querySelectorAll('span.cloze') : []);
    // console.log('Cloze spans found:', clozeSpans.length, clozeSpans);

    const nodeToMarkdown = (node: HTMLElement | null): string => {
        if (!node) return '';
        const res = replaceCodeBlockContent(node.innerHTML.trim() || '');
        const mathRes = replaceMarkdownMathContent(res);
        console.log('nodeToMarkdown', mathRes);
        return mathRes;
    }

    useEffect(() => {
        console.log('ClozeCard useEffect triggered');

        setClozeCardContent({
            front: nodeToMarkdown(frontNode),
            back: nodeToMarkdown(backNode),
            extra: nodeToMarkdown(extraNode)
        });
    }, [frontNode, backNode, extraNode, contentVersion]);
    return (
        <div ref={containerRef}>
            <Stack gap="md">
                {/* Front section */}
                {clozeCardContent.front && (<div>
                    <Text fw={600} size="sm" mb="xs" c="dimmed">
                        FRONT
                    </Text>
                    <Group mb="xs">
                        {clozeSpans.length > 0 && (
                            clozeSpans.map((span, index) => (
                                <ClozeToggle key={index} spanElement={span} label={`Cloze ${index + 1}`} back={clozeCardContent.back}/>
                            ))
                        )}
                    </Group>
                    <Paper
                        p="md"
                        bg={colors.front.bg}
                        style={getBorderStyle(colors.front.border)}
                        radius="sm"
                    >
                        <Markdown allowHtml={true}>{clozeCardContent.front}</Markdown>
                    </Paper>
                </div>)}

                {/* Back section */}
                {clozeCardContent.back && (<div>
                    <Text fw={600} size="sm" mb="xs" c="dimmed">
                        BACK
                    </Text>
                    <Paper
                        p="md"
                        bg={colors.back.bg}
                        style={getBorderStyle(colors.back.border)}
                        radius="sm"
                    >
                        <Markdown allowHtml={true}>{clozeCardContent.back}</Markdown>
                    </Paper>
                </div>)}

                {/* Extra section (fixed the typo: was "FRONT", now "EXTRA") */}
                {clozeCardContent.extra && (<div>
                    <Text fw={600} size="sm" mb="xs" c="dimmed">
                        EXTRA
                    </Text>
                    <Paper
                        p="md"
                        bg={colors.extra.bg}
                        style={getBorderStyle(colors.extra.border)}
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