import { FormEvent, useState } from 'react';
import { api, errMsg, logActivity } from '../api/client';
import { useToast } from '../components/Toast';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, LimitBanner, Modal, PageHeader, QueryBoundary, Select } from '../components/ui';
import { DEMO_PASSWORD, MEMBER_STATUS_TONE, ROLE_LABEL } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useFetch } from '../hooks/useFetch';
import { usePlanLimits } from '../hooks/usePlanLimits';
import type { Member, MemberStatus, Role, User } from '../types';

const ASSIGNABLE: Role[] = ['admin', 'pm', 'customer'];

export default function Team() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const toast = useToast();
  const limits = usePlanLimits();
  const [modal, setModal] = useState<{ member?: Member } | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useFetch(async () => {
    const [members, users] = await Promise.all([api.list<Member>('workspaceMembers', { workspaceId: workspace.id }), api.list<User>('users')]);
    return { members, users };
  }, [workspace.id]);

  return (
    <>
      <PageHeader title="Team & roles" subtitle="Control who can review feedback and manage the roadmap"
        actions={<Button disabled={limits.atLimit('members')} onClick={() => setModal({})}>Add member</Button>} />
      {limits.usage && <LimitBanner label="team members" used={limits.usage.members} limit={limits.limit.members} />}
      <QueryBoundary q={q}>
        {(d) => (
          <>
            {d.members.length === 0 ? <EmptyState title="No members" /> : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500"><tr><th className="px-4 py-3 font-medium">Member</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3" /></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.members.map((m) => {
                      const u = d.users.find((x) => x.id === m.userId);
                      const locked = m.role === 'owner';
                      return (
                        <tr key={m.id}>
                          <td className="px-4 py-3"><p className="font-medium">{u?.name ?? 'Unknown'}{m.userId === user!.id && <span className="ml-1 text-xs text-slate-400">(you)</span>}</p><p className="text-xs text-slate-500">{u?.email}</p></td>
                          <td className="px-4 py-3">{ROLE_LABEL[m.role]}</td>
                          <td className="px-4 py-3"><Badge tone={MEMBER_STATUS_TONE[m.status]}>{m.status}</Badge></td>
                          <td className="px-4 py-3 text-right">{!locked && <><Button variant="ghost" onClick={() => setModal({ member: m })}>Edit</Button><Button variant="ghost" className="text-red-600" onClick={() => setRemoving(m)}>Remove</Button></>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
            {modal && <MemberForm member={modal.member} members={d.members} users={d.users} onClose={() => setModal(null)} onSaved={() => { setModal(null); q.reload(); limits.reload(); }} />}
            <ConfirmDialog open={!!removing} title="Remove member" confirmLabel="Remove" busy={busy}
              message={`Remove ${d.users.find((u) => u.id === removing?.userId)?.name ?? 'this member'} from ${workspace.name}? They lose access immediately.`}
              onCancel={() => setRemoving(null)}
              onConfirm={async () => { const m = removing!; setBusy(true); try { await api.remove('workspaceMembers', m.id); logActivity(workspace.id, user!.id, 'removed a team member'); toast('Member removed'); setRemoving(null); q.reload(); limits.reload(); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); } }} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}

function MemberForm({ member, members, users, onClose, onSaved }: { member?: Member; members: Member[]; users: User[]; onClose: () => void; onSaved: () => void }) {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const toast = useToast();
  const limits = usePlanLimits();
  const editUser = member ? users.find((u) => u.id === member.userId) : undefined;
  const [email, setEmail] = useState(editUser?.email ?? '');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>(member?.role ?? 'customer');
  const [status, setStatus] = useState<MemberStatus>(member?.status ?? 'active');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const known = users.find((u) => u.email === email.trim().toLowerCase());

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!member) {
      if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter a valid email address.';
      else if (known && members.some((m) => m.userId === known.id)) er.email = 'This person is already a member.';
      if (!known && name.trim().length < 2) er.name = 'Enter a name for the new member.';
    }
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      if (member) {
        await api.update<Member>('workspaceMembers', member.id, { role, status });
        logActivity(workspace.id, user!.id, `updated ${editUser?.name ?? 'a member'}’s role`);
        toast('Member updated');
      } else {
        if ((await limits.fresh('members')) >= limits.limit.members) { setErrors({ form: `Your plan allows ${limits.limit.members} members. Upgrade to add more.` }); return; }
        const u = known ?? (await api.create<User>('users', { name: name.trim(), email: email.trim().toLowerCase(), password: DEMO_PASSWORD }));
        await api.create<Member>('workspaceMembers', { workspaceId: workspace.id, userId: u.id, role, status: known ? status : 'invited' });
        logActivity(workspace.id, user!.id, `added ${u.name} as ${ROLE_LABEL[role]}`);
        toast('Member added');
      }
      onSaved();
    } catch (err) { setErrors({ form: errMsg(err) }); } finally { setBusy(false); }
  }

  return (
    <Modal open title={member ? 'Edit member' : 'Add member'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.form && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
        <Field label="Email" error={errors.email}><Input type="email" value={email} disabled={!!member} onChange={(e) => setEmail(e.target.value)} /></Field>
        {!member && !known && email.includes('@') && <Field label="Name" error={errors.name} hint={`Creates a demo account with the password ${DEMO_PASSWORD}.`}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role"><Select value={role} onChange={(e) => setRole(e.target.value as Role)}>{ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
          <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value as MemberStatus)}>{(['active', 'invited', 'suspended'] as MemberStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
        </div>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : member ? 'Save changes' : 'Add member'}</Button></div>
      </form>
    </Modal>
  );
}
