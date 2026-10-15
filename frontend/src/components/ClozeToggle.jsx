import { Switch } from '@mantine/core';
import React, { useEffect, useState } from 'react'

function safeDecode(str) {
    try {
        return decodeURIComponent(str || '');
    } catch {
        return str || '';
    }
}

function ClozeToggle({ spanElement, label, onToggle }) {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        setIsActive(false);
    }, [spanElement]);

    const toggleCloze = (spanElement) => {
        const currentDataCloze = safeDecode(spanElement.getAttribute('data-cloze'));
        
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
                onToggle?.();
            }}
            label={label}
        />
    );
}

export default ClozeToggle
