import { Badge, Card, Group, useMantineColorScheme } from '@mantine/core';
import BasicCard from './components/BasicCard';
import ClozeCard from './components/ClozeCard';
import { useEffect, useState } from 'react';
import { Button } from '@mantine/core';
import IconCoffee from '@tabler/icons-react/dist/esm/icons/IconCoffee.mjs';
import { TagsAndDifficulty } from './components/Tags';
import {debounce} from 'lodash';



function Preview() {
    const { colorScheme } = useMantineColorScheme();

    const [basicNodes, setBasicNodes] = useState({ front: '', back: '', extra: '', contentVersion: 0 });
    const [clozeNodes, setClozeNodes] = useState({ front: '', back: '', extra: '', contentVersion: 0 });
    const [tags, setTags] = useState([]);
    const [difficulty, setDifficulty] = useState(null);
    const [showBuyMeACoffee, setShowBuyMeACoffee] = useState(false);
    const [triggerBuyMeACoffee, setTriggerBuyMeACoffee] = useState(0);

    // UseEffect to determine if the "Buy me a coffee" button should be shown
    useEffect(() => {
        const random = Math.random();
        if (random <= 0.002) {
            setShowBuyMeACoffee(true);
            // Set a timeout to hide the button after 20 seconds
            const _timer = setTimeout(() => {
                setShowBuyMeACoffee(false);
            }, 20000);
        }
    }, [triggerBuyMeACoffee]); // Empty dependency array ensures this runs only once on mount

    // Use useEffect to check DOM once and set state
    // Use useEffect to check DOM once and set state
    useEffect(() => {
        // // Helper function to parse fields and update state
        const updateFromFields = () => {
            const fields = document.getElementById('fields') || document.querySelector('.fields');
            if (!fields) return;
            const childElements = Array.from(fields.children).map((child) => {
                const labelElement = child.querySelector('span.label-name');
                const ankiEditable = child.querySelector('[class*="rich-text-editable"]')
                ?.shadowRoot?.querySelector('anki-editable') || child.querySelector('[class*="rich-text-editable"]')?.querySelector('anki-editable');
                
                if (!labelElement || !ankiEditable) return null;

                return {
                    label: labelElement.innerText?.trim(),
                    content: ankiEditable || ''
                };
            }).filter((el) => el !== null);
            // Determine card type and update state
            const isBasic = childElements.some(el => el.label.toLowerCase().includes('front'));
            if (isBasic) {
                setBasicNodes({
                    front: childElements.find(el => el.label.toLowerCase().includes('front'))?.content || '',
                    back: childElements.find(el => el.label.toLowerCase().includes('back'))?.content || '',
                    extra: childElements.find(el => el.label.toLowerCase().includes('extra'))?.content || '',
                    contentVersion: Date.now()
                });
                setClozeNodes({ front: '', back: '', extra: '', contentVersion: 0 });
            } else {
                const node = {
                    front: childElements.find(el => el.label.toLowerCase().includes('text'))?.content || '',
                    extra: childElements.find(el => el.label.toLowerCase().includes('extra'))?.content || '',
                    contentVersion: Date.now()
                }
                setClozeNodes({...node});
                setBasicNodes({ front: '', back: '', extra: '' });
            }

            const difficultyField = childElements.find(el => el.label.toLowerCase().includes('difficulty'));
            setDifficulty(difficultyField ? difficultyField.content.textContent.trim() : '');

            setTriggerBuyMeACoffee(prev => prev + 1);
        };

        const debouncedUpdateFromFields = debounce(updateFromFields, 500);

        // Initial setup
        debouncedUpdateFromFields();

        const observer = new MutationObserver((mutationsList) => {
            debouncedUpdateFromFields();
        });
        const observed_node = document.body.querySelector(".note-editor")
        observer.observe(observed_node, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
        });

        const handleKeyUp = (event) => {
            debouncedUpdateFromFields();
        };
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            observer.disconnect();
            window.removeEventListener('keyup', handleKeyUp);
        }
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
                bg: isDark ? 'dark.5' : 'blue.0',
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
        // TODO optional :  w={{ base: '100%', lg: '75%' }}
        <Card shadow="sm" padding="md" radius="md" withBorder>
            <TagsAndDifficulty tags={tags} difficulty={difficulty} />
            {showBasicCard && <BasicCard contentVersion={basicNodes.contentVersion} colors={colors} frontNode={basicNodes.front} backNode={basicNodes.back} extraNode={basicNodes.extra} />}
            {showClozeCard && <ClozeCard contentVersion={clozeNodes.contentVersion} colors={colors} frontNode={clozeNodes.front} backNode={clozeNodes.back} extraNode={clozeNodes.extra} />}

            {showBuyMeACoffee && (
                <Button
                    id="buy-me-a-coffee"
                    component="a"
                    href="https://coff.ee/alexthilleq"
                    target="_blank"
                    rel="noopener noreferrer"
                    leftSection={<IconCoffee size={24} />}
                    variant="filled"
                    color="yellow"
                    size="sm"
                    radius="md"
                    style={{
                        marginTop: '16px',
                        color: colorScheme === 'dark' ? 'var(--mantine-color-dark-9)' : 'var(--mantine-color-dark-9)'
                    }}
                >
                    Like this Addon? Consider Buying Me a Coffee!
                </Button>
            )}

        </Card>
    );
}

export default Preview;