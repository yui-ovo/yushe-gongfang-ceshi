// Toggle-only snapshots. Host APIs are injected so transitions can be tested without a browser.
export const copy = value => JSON.parse(JSON.stringify(value));
export function switches(data) {
  return Object.fromEntries(Object.values(data?.entries || {}).map(entry => [String(entry.uid), !!entry.disable]));
}
export function mergeSwitches(data, states) {
  const next = copy(data);
  let matched = 0;
  for (const entry of Object.values(next.entries || {})) {
    if (Object.hasOwn(states, String(entry.uid))) {
      entry.disable = !!states[String(entry.uid)];
      matched++;
    }
  }
  return { data: next, matched };
}
export function emptyStore() {
  return { version: 1, snapshots: [], groups: [], owned: [], session: null };
}

export function createWorldbookSnapshots(host) {
  let tail = Promise.resolve();
  let capturing = false;
  const queued = action => {
    const result = tail.then(action);
    tail = result.catch(() => {});
    return result;
  };
  const read = () => {
    const value = host.readStore();
    if (!value) return emptyStore();
    if (value.version !== 1 || !Array.isArray(value.snapshots) || !Array.isArray(value.groups)) {
      throw new Error('世界书快照数据无法识别，已停止写入');
    }
    return copy(value);
  };
  const persist = store => host.writeStore(copy(store));
  const find = (store, id) => {
    const item = store.snapshots.find(item => item.id === id);
    if (!item) throw new Error('快照已不存在');
    return item;
  };
  const bookRow = (catalog, name) => catalog.find(book => book.name === name);
  function eligible(catalog, name, scope) {
    const book = bookRow(catalog, name);
    if (!book) throw new Error(`世界书“${name}”已不存在，请重新选择`);
    if (scope === 'character' ? !book.characters.length : book.characters.length || !book.global) {
      throw new Error(`“${name}”的绑定或全局挂载已变化，请重新选择`);
    }
    return book;
  }
  function assertDrafts(names) {
    if (host.hasUnsaved?.(names)) throw new Error('这本世界书还有未保存的编辑，请先保存或取消编辑');
  }
  async function writeSwitches(name, states, restoring = false) {
    assertDrafts([name]);
    const source = await host.load(name);
    if (!source?.entries) throw new Error(`无法读取世界书“${name}”`);
    const result = mergeSwitches(source, states);
    if (!restoring && !result.matched && Object.keys(states).length) throw new Error(`“${name}”的原条目已不存在，未应用快照`);
    if (JSON.stringify(switches(source)) !== JSON.stringify(switches(result.data))) {
      await host.save(name, result.data);
      try { await host.changed?.(name, result.data); }
      catch (error) { host.notice?.(`“${name}”已保存，但编辑器刷新失败：${error.message}`); }
    }
    return result.matched;
  }
  // Restore one book at a time; persist progress so an interrupted restore is retryable.
  async function restore(store, keep = new Set()) {
    if (!store.session) return;
    const names = Object.keys(store.session.before).filter(name => !keep.has(name));
    assertDrafts(names);
    for (const name of names) {
      if (!host.exists || await host.exists(name)) await writeSwitches(name, store.session.before[name], true);
      else host.notice?.(`“${name}”已被删除，已跳过它的开关恢复`);
      delete store.session.before[name];
      delete store.session.applied[name];
      persist(store);
    }
    if (!Object.keys(store.session.before).length) {
      store.session = null;
      persist(store);
    }
  }
  async function applyBound(store, item, character) {
    if (!store.session) store.session = { key: character.key, before: {}, applied: {} };
    if (!Object.hasOwn(store.session.before, item.book)) {
      assertDrafts([item.book]);
      const data = await host.load(item.book);
      if (!data?.entries) throw new Error(`无法读取世界书“${item.book}”`);
      Object.defineProperty(store.session.before, item.book, { value: switches(data), enumerable: true, configurable: true, writable: true });
      persist(store); // Journal before touching the shared worldbook.
    }
    await writeSwitches(item.book, item.states);
    Object.defineProperty(store.session.applied, item.book, { value: item.id, enumerable: true, configurable: true, writable: true });
    persist(store);
  }
  async function transition() {
    if (capturing) return { deferred: true };
    const store = read();
    const character = host.character();
    if (store.session && store.session.key !== character?.key) await restore(store);
    if (!character) return { restored: true };
    const targets = store.snapshots.filter(item => item.scope === 'character' && item.characters.includes(character.key));
    if (!targets.length) { await restore(store); return {}; }
    const catalog = await host.catalog();
    const valid = targets.filter(item => bookRow(catalog, item.book)?.characters.some(row => row.key === character.key));
    await restore(store, new Set(valid.map(item => item.book)));
    for (const item of valid) {
      if (host.character()?.key !== character.key) return transition();
      if (store.session?.applied[item.book] === item.id) continue;
      await applyBound(store, item, character);
    }
    if (host.character()?.key !== character.key) return transition();
    return {};
  }
  return {
    read,
    idle: () => tail,
    setCapturing(value) { capturing = !!value; },
    transition: () => queued(transition),
    capture: (book, scope) => queued(async () => {
      eligible(await host.catalog(), book, scope);
      assertDrafts([book]);
      const data = await host.load(book);
      if (!data?.entries) throw new Error('无法读取世界书条目');
      return copy(data);
    }),
    create: ({ book, scope, name, states, contextKey }) => queued(async () => {
      if ((host.character()?.key || '') !== contextKey) throw new Error('角色已切换，请取消草稿后在当前角色重新创建');
      eligible(await host.catalog(), book, scope);
      if (!name.trim()) throw new Error('请填写快照名称');
      // Check storage first, then apply; roll switches back if persistence fails.
      const store = read();
      const before = switches(await host.load(book));
      const item = { id: host.id(), name: name.trim(), book, scope, states: copy(states), characters: [], created: Date.now() };
      await writeSwitches(book, states);
      try { store.snapshots.push(item); persist(store); }
      catch (error) { await writeSwitches(book, before); throw error; }
      return copy(item);
    }),
    apply: id => queued(async () => {
      if (capturing) throw new Error('请先保存或取消正在编辑的快照');
      const store = read(), item = find(store, id);
      eligible(await host.catalog(), item.book, item.scope);
      await writeSwitches(item.book, item.states);
    }),
    rename: (id, name) => queued(() => {
      if (!name.trim()) throw new Error('请填写名称');
      const store = read(); find(store, id).name = name.trim(); persist(store);
    }),
    remove: id => queued(async () => {
      const store = read(); find(store, id);
      store.snapshots = store.snapshots.filter(item => item.id !== id); persist(store);
      await transition();
    }),
    bind: id => queued(async () => {
      if (capturing) throw new Error('请先保存或取消正在编辑的快照');
      const character = host.character();
      if (!character) throw new Error('请先进入一个角色聊天');
      const store = read(), item = find(store, id);
      const book = eligible(await host.catalog(), item.book, 'character');
      if (!book.characters.some(row => row.key === character.key)) throw new Error('这本世界书没有绑定当前角色');
      const unbind = item.characters.includes(character.key);
      for (const other of store.snapshots.filter(other => other.book === item.book)) {
        other.characters = other.characters.filter(key => key !== character.key);
      }
      if (!unbind) item.characters.push(character.key);
      persist(store);
      await transition();
      return !unbind;
    }),
    saveGroup: ({ id, name, books }) => queued(async () => {
      if (!name.trim() || !books.length) throw new Error('请填写组名并至少选择一本世界书');
      const store = read(), catalog = await host.catalog();
      if (books.some(name => !bookRow(catalog, name) || bookRow(catalog, name).characters.length)) {
        throw new Error('分组只能选择没有绑定角色的世界书');
      }
      let group = store.groups.find(group => group.id === id);
      if (group?.enabled) throw new Error('请先关闭分组再编辑成员');
      if (!group) { group = { id: host.id(), enabled: false }; store.groups.push(group); }
      Object.assign(group, { name: name.trim(), books: [...new Set(books)] });
      persist(store);
    }),
    toggleGroup: id => queued(async () => {
      const store = read(), group = store.groups.find(group => group.id === id);
      if (!group) throw new Error('分组已不存在');
      const catalog = await host.catalog();
      if (!group.enabled && group.books.some(name => !bookRow(catalog, name) || bookRow(catalog, name).characters.length)) {
        throw new Error('分组中有世界书被删除或绑定了角色，请先编辑分组');
      }
      const current = await host.globals();
      const owned = new Set((store.owned || []).filter(name => current.includes(name)));
      let next;
      if (!group.enabled) {
        for (const name of group.books) if (!current.includes(name)) owned.add(name);
        next = [...new Set([...current, ...group.books])];
      } else {
        const needed = new Set(store.groups.filter(other => other.id !== id && other.enabled).flatMap(other => other.books));
        const remove = new Set(group.books.filter(name => owned.has(name) && !needed.has(name)
          && bookRow(catalog, name) && !bookRow(catalog, name).characters.length));
        next = current.filter(name => !remove.has(name));
        for (const name of remove) owned.delete(name);
      }
      await host.setGlobals(next);
      group.enabled = !group.enabled; store.owned = [...owned];
      try { persist(store); }
      catch (error) { await host.setGlobals(current); throw error; }
    }),
    removeGroup: id => queued(() => {
      const store = read(), group = store.groups.find(group => group.id === id);
      if (group?.enabled) throw new Error('请先关闭分组再删除');
      store.groups = store.groups.filter(group => group.id !== id); persist(store);
    }),
  };
}
