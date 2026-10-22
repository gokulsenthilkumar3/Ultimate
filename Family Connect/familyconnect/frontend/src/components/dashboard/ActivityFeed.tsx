import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../common/Card';
import { Avatar } from '../common/Avatar';
import type { ActivityItem, Member, FamilyEvent, FamilyDocument } from '../../types/family';
import { useFamilyStore, selectMembers, selectEvents, selectDocuments } from '../../store/familyStore';
import { formatDistanceToNow } from 'date-fns';

export const ActivityFeed: React.FC = () => {
  const members = useFamilyStore(selectMembers);
  const events = useFamilyStore(selectEvents);
  const documents = useFamilyStore(selectDocuments);

  const activities = useMemo(() => {
    const items: ActivityItem[] = [];

    members.forEach((m: Member) => {
      items.push({
        id: `member-${m.id}`,
        type: 'member_added',
        actorName: 'Tree Admin', // We don't have createdBy populated on frontend yet
        description: 'added a new family member',
        targetName: m.name,
        timestamp: m.createdAt,
      });
    });

    events.forEach((e: FamilyEvent) => {
      items.push({
        id: `event-${e.id}`,
        type: 'event_added',
        actorName: 'Tree Admin',
        description: 'scheduled an event',
        targetName: e.title,
        timestamp: e.createdAt,
      });
    });

    documents.forEach((d: FamilyDocument) => {
      items.push({
        id: `doc-${d.id}`,
        type: 'photo_added',
        actorName: 'Tree Admin',
        description: 'uploaded media',
        targetName: d.fileName,
        timestamp: d.uploadedAt,
      });
    });

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10); // Show latest 10
  }, [members, events, documents]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="space-y-6">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500 italic p-4 text-center">No recent activity.</p>
          ) : (
            activities.map((activity, index) => (
              <div key={activity.id} className="relative flex space-x-3">
                {/* Connector Line */}
                {index !== activities.length - 1 && (
                  <div className="absolute top-8 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                )}
                
                <Avatar name={activity.actorName} src={activity.actorPhoto} size="sm" className="ring-8 ring-white z-10" />
                
                <div className="flex-1 min-w-0 pt-1.5">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-gray-900">{activity.actorName}</span>{' '}
                    {activity.description}{' '}
                    {activity.targetName && <span className="font-medium text-[var(--color-navy)]">{activity.targetName}</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
};
