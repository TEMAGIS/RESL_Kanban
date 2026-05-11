import { useDroppable } from '@dnd-kit/core';
import { FIELDS } from '../config.js';
import Card from './Card.jsx';

export default function Column({ id, label, accent, resources, pending, droppable, readOnly = false, onShowDetail, hint }) {
  // In read-only mode the column is never a drop target — even if
  // droppable was true — and cards inside are not draggable.
  const dropOn = droppable && !readOnly;
  const { isOver, setNodeRef } = useDroppable({ id, disabled: !dropOn });

  return (
    <div
      ref={dropOn ? setNodeRef : undefined}
      className={`column${isOver ? ' is-over' : ''}${dropOn ? '' : ' is-static'}`}
      style={{ '--column-accent': accent }}
    >
      <header className="column-header">
        <span className="column-dot" />
        <span className="column-label">{label}</span>
        <span className="column-count">{resources.length}</span>
      </header>
      <div className="column-body">
        {resources.map((r) => (
          <Card
            key={r[FIELDS.objectId]}
            r={r}
            pending={pending.has(r[FIELDS.objectId])}
            readOnly={readOnly}
            onShowDetail={onShowDetail}
          />
        ))}
        {dropOn && resources.length === 0 && (
          <div className="empty-hint">{hint || 'Drop here'}</div>
        )}
      </div>
    </div>
  );
}
