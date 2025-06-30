import React, { useRef } from 'react'
import { useEffect, useState } from 'react';
import Markdown from './Markdown'
import { Card, Paper, Stack, Text, Switch, Group } from '@mantine/core';
import ClozeToggle from './ClozeToggle';

function removeClozeSpans(htmlString) {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = htmlString;

    // Find all spans with class "cloze"
    const clozeSpans = doc.querySelectorAll('span.cloze, span.cloze-inactive');
    
    clozeSpans.forEach(span => {
        // Replace the span with its content (unwrap)
        span.outerHTML = span.innerHTML;
    });

    // Return the modified HTML
    let res = doc.body.innerHTML;
    return res;
}

function replaceCodeContent(markdownText) {
    const codeBlockRegex = /\`\`\`(\w+)([\s\S]*?)\`\`\`/g;

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
    const [resetToggle, setResetToggle] = useState(0);
    const getBorderStyle = (borderColor) => (theme) => {
        const [colorKey, shadeStr] = borderColor.split('.');
        const shade = parseInt(shadeStr, 10);
        return { border: `1px solid ${theme.colors[colorKey][shade]}` };
    };
    const root = document.getElementById('front-card-cloze');
    const clozeSpans = Array.from(root ? root.querySelectorAll('span.cloze') : []);

    const nodeToMarkdown = (node: HTMLElement | null): string => {
        if (!node) return '';
        const res = replaceCodeContent(node.innerHTML.trim() || '');
        const mathRes = replaceMarkdownMathContent(res);
        return mathRes;
    }

    function symmetricConcat(s1, s2) {
        return [s1, s2].sort().join('');
    }

    useEffect(() => {
        if (clozeCardContent.back !== nodeToMarkdown(backNode)) {
            setResetToggle(prev => prev + 1); // Increment to reset toggles
        }

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
                    <Text fw={600} size="lg" mb="xs" c="dimmed">
                        FRONT
                    </Text>
                    <Group mb="xs">
                        {clozeSpans.length > 0 && (
                            clozeSpans.map((span, index) => (
                                <ClozeToggle key={index} spanElement={span} label={`Cloze ${index + 1}`} text={symmetricConcat(span.getAttribute('data-cloze'), span.textContent)} />
                            ))
                        )}
                    </Group>

                    <Paper
                        p="md"
                        bg={colors.front.bg}
                        style={{
                            ...getBorderStyle(colors.front.border),
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}
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
                        style={getBorderStyle(colors.back.border)}
                        radius="sm"
                    >
                        <Markdown allowHtml={true}>{clozeCardContent.back}</Markdown>
                    </Paper>
                </div>)}

                {/* Extra section (fixed the typo: was "FRONT", now "EXTRA") */}
                {clozeCardContent.extra && (<div>
                    <Text fw={600} size="lg" mb="xs" c="dimmed">
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