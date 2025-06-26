import { Switch, useMantineColorScheme } from '@mantine/core';
import React, { useEffect, useState } from 'react'

function ClozeToggle({ spanElement, label, back }) {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        setIsActive(false);
    }, [back]);

    const toggleCloze = (spanElement) => {
        const currentDataCloze = spanElement.getAttribute('data-cloze');
        const currentText = spanElement.textContent;
        spanElement.setAttribute('data-cloze', currentText);
        spanElement.textContent = currentDataCloze;
    }

    return (
        <Switch
            checked={isActive}
            onChange={(event) => {
                setIsActive(event.currentTarget.checked);
                toggleCloze(spanElement);
            }}
            label={label}
        />
    );
}

export default ClozeToggle