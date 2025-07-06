import React from 'react'
import { useEffect, useState } from 'react';
import Markdown from './Markdown';
import { Card, Paper, Stack, Text } from '@mantine/core';




function BasicCard({
    frontNode, backNode, extraNode, contentVersion,
    colors
}) {
    const [basicCardContent, setBasicCardContent] = useState({
        front: 'Loading...',
        back: 'Loading...',
        extra: 'Loading...'
    });
    const getBorderStyle = (borderColor) => (theme) => {
        const [colorKey, shadeStr] = borderColor.split('.');
        const shade = parseInt(shadeStr, 10);
        return { border: `1px solid ${theme.colors[colorKey][shade]}` };
    };

    useEffect(() => {
        setBasicCardContent({
            front: frontNode?.innerHTML.trim() || '',
            back:  backNode?.innerHTML.trim() || '',
            extra: extraNode?.innerHTML.trim() || ''
        });
    }, [frontNode, backNode, extraNode, contentVersion]);

    return (
        <div>
            <Stack gap="md">
                {/* Front section */}
                <div>
                    <Text fw={600} size="md" mb="xs" c="dimmed">
                        FRONT
                    </Text>
                    <Paper
                        p="md"
                        bg={colors.front.bg}
                        style={getBorderStyle(colors.front.border)}
                        radius="sm"
                    >
                        <Markdown allowHtml={true}>{basicCardContent.front}</Markdown>
                    </Paper>
                </div>

                {/* Back section */}
                {basicCardContent.back && (<div>
                    <Text fw={600} size="md" mb="xs" c="dimmed">
                        BACK
                    </Text>
                    <Paper
                        p="md"
                        bg={colors.back.bg}
                        style={getBorderStyle(colors.back.border)}
                        radius="sm"
                    >
                        <Markdown allowHtml={true}>{basicCardContent.back}</Markdown>
                    </Paper>
                </div>)}

                {/* Extra section (fixed the typo: was "FRONT", now "EXTRA") */}
                {basicCardContent.extra && (<div>
                    <Text fw={600} size="md" mb="xs" c="dimmed">
                        EXTRA
                    </Text>
                    <Paper
                        p="md"
                        bg={colors.extra.bg}
                        style={getBorderStyle(colors.extra.border)}
                        radius="sm"
                    >
                        <Markdown allowHtml={true}>{basicCardContent.extra}</Markdown>
                    </Paper>
                </div>)}
            </Stack>
        </div>
    )
}

export default BasicCard;