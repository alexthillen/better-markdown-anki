function ClozeIndexBadge({ index, ariaHidden = false }) {
    return (
        <span
            className="bma-cloze-index"
            aria-hidden={ariaHidden || undefined}
            aria-label={ariaHidden ? undefined : `Cloze ${index}`}
        >
            {index}
        </span>
    );
}

export default ClozeIndexBadge;
