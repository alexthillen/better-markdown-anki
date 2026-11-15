import React from 'react'
import { Group, Badge } from '@mantine/core'

export function Tags({ tags }) {
  return (
    <>
    
      {tags && tags.length > 0 && (
        <Group mb="sm">
          {tags.map((tag, index) => (
            <Badge key={index} variant="light" color="gray" size="lg">
              {tag}
            </Badge>
          ))}
        </Group>
      )}
    </>
  )
}

export function DifficultyBadge({ difficulty }) {
  return (
    <>
        <Group mb="sm">
      {difficulty && (
          <Badge variant="light" color="orange" size="lg">
            {difficulty}
          </Badge>
      )}
      </Group>
    </>
  )
}

export function TagsAndDifficulty({ tags, difficulty, action }) {
    return <Group justify="space-between" align="flex-start" wrap="wrap">
        <Group gap="sm" align="center" mb="sm">
            {difficulty && <Badge variant="light" color="orange" size="lg">{difficulty}</Badge>}
            {action}
        </Group>
        <Tags tags={tags} />
    </Group>
}