const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Update Provider
schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');

// 2. Add source, confidence, updated_at to existing models
const modelRegex = /model\s+\w+\s+\{([\s\S]*?)\}/g;
schema = schema.replace(modelRegex, (match, body) => {
  let newBody = body;
  
  if (!newBody.includes('source ')) {
    newBody = newBody.replace(/(\n\s*@@)/, '\n  source      String   @default("manual")\n$1');
  }
  if (!newBody.includes('confidence ')) {
    newBody = newBody.replace(/(\n\s*@@)/, '\n  confidence  Float    @default(1.0)\n$1');
  }
  if (!newBody.includes('updated_at ')) {
    newBody = newBody.replace(/(\n\s*@@)/, '\n  updated_at  DateTime @default(now()) @updatedAt\n$1');
  }

  // Fallback if there was no @@map or @@unique in the model (unlikely here but just in case)
  if (newBody === body) {
     if (!newBody.includes('source ')) newBody += '  source      String   @default("manual")\n';
     if (!newBody.includes('confidence ')) newBody += '  confidence  Float    @default(1.0)\n';
     if (!newBody.includes('updated_at ')) newBody += '  updated_at  DateTime @default(now()) @updatedAt\n';
  }

  return match.replace(body, newBody);
});

// 3. Append new entities
const newEntities = `

// --- Phase 1: Core Personal OS Entities ---

model Project {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  repository  String?
  commits     Int      @default(0)
  stars       Int      @default(0)
  source      String   @default("manual")
  confidence  Float    @default(1.0)
  created_at  DateTime @default(now())
  updated_at  DateTime @default(now()) @updatedAt
  
  @@map("projects")
}

model SkillEntity {
  id          Int      @id @default(autoincrement())
  name        String
  knowledge   Float    @default(0)
  retention   Float    @default(0)
  source      String   @default("manual")
  confidence  Float    @default(1.0)
  created_at  DateTime @default(now())
  updated_at  DateTime @default(now()) @updatedAt

  @@map("skill_entities")
}

model LearningEvent {
  id          Int      @id @default(autoincrement())
  title       String
  type        String   @default("Course")
  hours       Float    @default(0)
  source      String   @default("manual")
  confidence  Float    @default(1.0)
  created_at  DateTime @default(now())
  updated_at  DateTime @default(now()) @updatedAt

  @@map("learning_events")
}

model HealthMetric {
  id          Int      @id @default(autoincrement())
  date        DateTime @default(now())
  metric_type String
  value       Float
  unit        String?
  notes       String?
  source      String   @default("manual")
  confidence  Float    @default(1.0)
  created_at  DateTime @default(now())
  updated_at  DateTime @default(now()) @updatedAt

  @@map("health_metrics")
}
`;

fs.writeFileSync(schemaPath, schema + newEntities);
console.log("Schema updated successfully!");
