import { Switch, useMantineColorScheme } from '@mantine/core';
import React, { useEffect, useState } from 'react'

function ClozeToggle({ spanElement, label, text }) {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        setIsActive(false);
    }, [text]);

    const toggleCloze = (spanElement) => {
        const currentDataCloze = decodeURIComponent(spanElement.getAttribute('data-cloze')  || '');
        const currentText = encodeURIComponent(spanElement.innerHTML) || '';
        spanElement.setAttribute('data-cloze', currentText);
        spanElement.innerHTML = currentDataCloze;
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