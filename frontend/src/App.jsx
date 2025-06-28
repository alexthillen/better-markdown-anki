import { Badge, Card, Group, useMantineColorScheme } from '@mantine/core';
import BasicCard from './components/BasicCard';
import ClozeCard from './components/ClozeCard';
import { useEffect, useState } from 'react';
import { Button } from '@mantine/core';
import IconCoffee from '@tabler/icons-react/dist/esm/icons/IconCoffee.mjs';
import { TagsAndDifficulty } from './components/Tags';


function App() {
    const { colorScheme } = useMantineColorScheme();

    /*-------------------------------------------------------------------
   * Theme-aware color configuration
   *------------------------------------------------------------------*/

    const basicIds = ['front-card-basic', 'back-card-basic', 'extra-card-basic'];
    const clozeIds = ['front-card-cloze', 'back-card-cloze', 'extra-card-cloze'];
    const tagsIds = ['tags-card', 'tags-card-basic', 'tags-card-cloze'];
    const difficultyIds = ['difficulty-card', 'difficulty-card-basic', 'difficulty-card-cloze'];

    const [basicNodes, setBasicNodes] = useState({ front: null, back: null, extra: null });
    const [clozeNodes, setClozeNodes] = useState({ front: null, back: null, extra: null, contentVersion: 0 });
    const [tags, setTags] = useState([]);
    const [difficulty, setDifficulty] = useState(null);

    const stringToTags = (str) => {
        if (!str) return [];
        return str
            .trim()
            .split(/\s+/)
            .filter((tag) => tag.length > 0);
    };

    // State for controlling the visibility of the "Buy me a coffee" button
    const [showBuyMeACoffee, setShowBuyMeACoffee] = useState(false);
    const [tiggerBuyMeACoffee, setTriggerBuyMeACoffee] = useState(0);

    // UseEffect to determine if the "Buy me a coffee" button should be shown
    useEffect(() => {
        const random = Math.random();
        if (random <= 0.03) {
            setShowBuyMeACoffee(true);
        } else {
            setShowBuyMeACoffee(false);
        }
    }, [tiggerBuyMeACoffee]); // Empty dependency array ensures this runs only once on mount

    // Use useEffect to check DOM once and set state
    useEffect(() => {
        const basicElements = basicIds.map(id => document.getElementById(id));
        const clozeElements = clozeIds.map(id => document.getElementById(id));
        const tagElement = tagsIds.map(id => document.getElementById(id)).filter((el) => el !== null)[0];
        const difficultyElement = difficultyIds.map(id => document.getElementById(id)).filter((el) => el !== null)[0];


        setBasicNodes({
            front: basicElements[0],
            back: basicElements[1],
            extra: basicElements[2],
        });

        setClozeNodes({
            front: clozeElements[0],
            back: clozeElements[1],
            extra: clozeElements[2],
            contentVersion: Date.now()
        });
        setTags(stringToTags(tagElement ? tagElement.innerText : ''));
        setDifficulty(difficultyElement ? difficultyElement.innerText.trim() : null);

        setTriggerBuyMeACoffee(prev => prev + 1);

        const observer = new MutationObserver((mutationsList) => {
            const relevantIds = [...basicIds, ...clozeIds];
            const hasRelevantMutation = mutationsList.some(({ target, addedNodes, removedNodes }) => {
                const hasRelevantAncestor = (node) => {
                    if (!node) return false;

                    let current = node;
                    while (current) {
                        // Check if current node has a relevant ID
                        if (current.id && relevantIds.includes(current.id)) {
                            return true;
                        }
                        // Move up to parent
                        current = current.parentNode;
                        // Stop at document level
                        if (current && current.nodeType === Node.DOCUMENT_NODE) break;
                    }
                    return false;
                };
                const allNodes = [target, ...Array.from(addedNodes), ...Array.from(removedNodes)];
                return allNodes.some(hasRelevantAncestor);
            });


            if (!hasRelevantMutation) return;

            const updatedBasicElements = basicIds.map(id => document.getElementById(id));
            const updatedClozeElements = clozeIds.map(id => document.getElementById(id));
            const updatedTagsElement = tagsIds.map(id => document.getElementById(id)).filter((el) => el !== null)[0];
            const updatedDifficultyElement = difficultyIds.map(id => document.getElementById(id)).filter((el) => el !== null)[0];

            setBasicNodes({
                front: updatedBasicElements[0],
                back: updatedBasicElements[1],
                extra: updatedBasicElements[2],
            });

            setClozeNodes({
                front: updatedClozeElements[0],
                back: updatedClozeElements[1],
                extra: updatedClozeElements[2],
                contentVersion: Date.now()
            });
            setTags(stringToTags(updatedTagsElement ? updatedTagsElement.innerText : ''));
            setDifficulty(updatedDifficultyElement ? updatedDifficultyElement.innerText.trim() : null);
            setTriggerBuyMeACoffee(prev => prev + 1);
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

            <TagsAndDifficulty tags={tags} difficulty={difficulty} />
            {showBasicCard && <BasicCard contentVersion={basicNodes.contentVersion} colors={colors} frontNode={basicNodes.front} backNode={basicNodes.back} extraNode={basicNodes.extra} />}
            {showClozeCard && <ClozeCard contentVersion={clozeNodes.contentVersion} colors={colors} frontNode={clozeNodes.front} backNode={clozeNodes.back} extraNode={clozeNodes.extra} />}


            {showBuyMeACoffee && (
                <Button
                    component="a"
                    href="https://coff.ee/alexthilleq"
                    target="_blank"
                    rel="noopener noreferrer"
                    leftSection={<IconCoffee size={16} />}
                    variant="filled"
                    color="yellow"
                    size="sm"
                    radius="md"
                    style={{
                        marginTop: '16px',
                        color: colorScheme === 'dark' ? 'var(--mantine-color-dark-9)' : 'var(--mantine-color-dark-9)'
                    }}
                >
                    Buy me a coffee
                </Button>
            )}

        </Card>
    );
}

export default App;