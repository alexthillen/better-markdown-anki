import { Card, Paper, Stack, Text, useMantineColorScheme } from '@mantine/core';
import Markdown from './components/Markdown';
import BasicCard from './components/BasicCard';
import ClozeCard from './components/ClozeCard';
import { useEffect, useState } from 'react';



function App() {
    const { colorScheme } = useMantineColorScheme();

    /*-------------------------------------------------------------------
   * Theme-aware color configuration
   *------------------------------------------------------------------*/

    const basicIds = ['front-card-basic', 'back-card-basic', 'extra-card-basic'];
    const clozeIds = ['front-card-cloze', 'back-card-cloze', 'extra-card-cloze'];

    const [basicNodes, setBasicNodes] = useState({front: null, back: null, extra: null});
    const [clozeNodes, setClozeNodes] = useState({front: null, back: null, extra: null});

    // Use useEffect to check DOM once and set state
    useEffect(() => {
        const basicElements = basicIds.map(id => document.getElementById(id));
        const clozeElements = clozeIds.map(id => document.getElementById(id));

        setBasicNodes({
            front: basicElements[0],
            back: basicElements[1],
            extra: basicElements[2]
        });

        setClozeNodes({
            front: clozeElements[0],
            back: clozeElements[1],
            extra: clozeElements[2]
        });

        const observer = new MutationObserver((mutationsList) => {
            const relevantIds = [...basicIds, ...clozeIds];
            const hasRelevantMutation = mutationsList.some(({ target, addedNodes, removedNodes }) =>
                [target, ...addedNodes, ...removedNodes]
                    .some(node => node?.id && relevantIds.includes(node.id))
            );
            if (!hasRelevantMutation) return;

            const updatedBasicElements = basicIds.map(id => document.getElementById(id));
            const updatedClozeElements = clozeIds.map(id => document.getElementById(id));

            setBasicNodes({
                front: updatedBasicElements[0],
                back: updatedBasicElements[1],
                extra: updatedBasicElements[2]
            });

            setClozeNodes({
                front: updatedClozeElements[0],
                back: updatedClozeElements[1],
                extra: updatedClozeElements[2]
            });
        });

        // Observe the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

    }, []);

    const [showBasicCard, setShowBasicCard] = useState(false);
    const [showClozeCard, setShowClozeCard] = useState(false);

    useEffect(() => {
        // Check if any of the basic nodes are present
        const hasBasicContent = basicNodes.front || basicNodes.back || basicNodes.extra;
        const hasClozeContent = clozeNodes.front || clozeNodes.back || clozeNodes.extra;
        setShowBasicCard(hasBasicContent);
        setShowClozeCard(hasClozeContent);
    }, [basicNodes, clozeNodes]);


    const getThemeColors = () => {
        const isDark = colorScheme === 'dark';

        return {
            front: {
                bg: isDark ? 'dark.6' : 'gray.1',
                border: isDark ? 'dark.4' : 'gray.3'
            },
            back: {
                bg: isDark ? 'dark.5' : 'blue.1',
                border: isDark ? 'blue.8' : 'blue.3'
            },
            extra: {
                bg: isDark ? 'dark.4' : 'yellow.1',
                border: isDark ? 'yellow.8' : 'yellow.3'
            }
        };
    };

    const colors = getThemeColors();

    /*-------------------------------------------------------------------
     * Helper function for consistent border styling
     *------------------------------------------------------------------*/



    /*-------------------------------------------------------------------
     * Render card sections
     *------------------------------------------------------------------*/
    return (
        <Card shadow="sm" padding="md" radius="md" withBorder>
            {showBasicCard && <BasicCard colors={colors} frontNode={basicNodes.front} backNode={basicNodes.back} extraNode={basicNodes.extra} />}
            {showClozeCard && <ClozeCard colors={colors} frontNode={clozeNodes.front} backNode={clozeNodes.back} extraNode={clozeNodes.extra} />}

            <Markdown allowHtml={true}>
                {`\`\`\`python
# Example Python code
import os
print("Hello World")
\`\`\``}
            </Markdown>
        </Card>
    );
}

export default App;
