import prisma from "./prisma";

export async function writeAuditLog(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId:    params.adminId,
        action:     params.action,
        targetType: params.targetType,
        targetId:   params.targetId,
        meta:       params.meta as unknown,
      },
    });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
