<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiOptionGroup from '@/components/ui-kit/option-group.vue'
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiTappable from '@/components/ui-kit/tappable.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import FieldRow from '@/components/layout-kit/field-row.vue'
import AvatarImage from '@/components/member/avatar-image.vue'
import {
  useUpdateCapabilityMutation,
  useCapabilityGrantsQuery,
  useAddCapabilityGrantMutation,
  useRemoveCapabilityGrantMutation
} from '@/api/capabilities'
import { useMemberSearchQuery } from '@/api/members'

const { item } = defineProps<{ item: Capability }>()

const { t } = useI18n()
const updateCapability = useUpdateCapabilityMutation()
const addGrant = useAddCapabilityGrantMutation()
const removeGrant = useRemoveCapabilityGrantMutation()

const search_term = ref('')

const { data: grants, isLoading: grants_loading } = useCapabilityGrantsQuery(() => item.key)
const { data: search_results } = useMemberSearchQuery(search_term)

const state_options = computed(() => [
  { value: 'off' as CapabilityState, label: t('admin.capabilities.state.off') },
  { value: 'on' as CapabilityState, label: t('admin.capabilities.state.on') },
  { value: 'targeted' as CapabilityState, label: t('admin.capabilities.state.targeted') }
])

const state = computed<CapabilityState>({
  get: () => item.state,
  set: (next) => updateCapability.mutate({ key: item.key, state: next })
})

const searched = computed(() => search_term.value.trim().length >= 2)

const granted_ids = computed(() => new Set((grants.value ?? []).map((grant) => grant.id)))

const search_matches = computed(() =>
  (search_results.value ?? []).filter((member) => !granted_ids.value.has(member.id))
)

function onAddMember(member: MemberSearchResult) {
  addGrant.mutate({
    key: item.key,
    member: { id: member.id, display_name: member.display_name, avatar_url: member.avatar_url }
  })
  search_term.value = ''
}

function onRemoveMember(member_id: string) {
  removeGrant.mutate({ key: item.key, member_id })
}
</script>

<template>
  <div
    data-testid="admin-capabilities-row"
    data-station="panel"
    class="bg-surface rounded-8 flex w-full flex-col gap-4 p-6"
  >
    <div class="flex w-full items-center justify-between gap-4">
      <span class="flex flex-col gap-1">
        <span data-testid="admin-capabilities-row__name" class="text-ink text-lg">
          {{ t(`admin.capabilities.${item.key}.name`) }}
        </span>
        <span data-testid="admin-capabilities-row__description" class="text-ink-muted text-base">
          {{ t(`admin.capabilities.${item.key}.description`) }}
        </span>
      </span>

      <ui-option-group
        v-model:value="state"
        data-testid="admin-capabilities-row__state"
        :options="state_options"
      />
    </div>

    <div
      v-if="state === 'targeted'"
      data-testid="admin-capabilities-row__editor"
      class="flex flex-col gap-4"
    >
      <div class="flex flex-col gap-2">
        <ui-input
          v-model:value="search_term"
          data-testid="admin-capabilities-row__search-input"
          size="sm"
          :placeholder="t('admin.capabilities.editor.search-placeholder')"
        />

        <div
          v-if="searched && search_matches.length"
          data-testid="admin-capabilities-row__search-results"
          class="flex flex-col gap-1"
        >
          <ui-tappable
            v-for="member in search_matches"
            :key="member.id"
            as="button"
            type="button"
            data-testid="admin-capabilities-row__search-result"
            class="rounded-3 flex w-full items-center gap-3 p-2 text-left"
            @tap="onAddMember(member)"
          >
            <div class="bg-well size-9 shrink-0 overflow-hidden rounded-full">
              <avatar-image :avatar="member.avatar_url ?? undefined" class="h-full w-full" />
            </div>
            <span class="flex min-w-0 flex-col">
              <span
                data-testid="admin-capabilities-row__search-result-name"
                class="text-ink truncate text-base"
              >
                {{ member.display_name }}
              </span>
              <span
                v-if="member.email"
                data-testid="admin-capabilities-row__search-result-email"
                class="text-ink-muted truncate text-sm"
              >
                {{ member.email }}
              </span>
            </span>
          </ui-tappable>
        </div>

        <p
          v-else-if="searched"
          data-testid="admin-capabilities-row__no-results"
          class="text-ink-muted text-base"
        >
          {{ t('admin.capabilities.editor.no-results') }}
        </p>
      </div>

      <div
        v-if="grants_loading"
        data-testid="admin-capabilities-row__granted-skeleton"
        class="flex flex-col gap-2"
      >
        <div v-for="n in 2" :key="n" class="flex items-center gap-3">
          <div class="bg-skeleton shimmer size-9 shrink-0 rounded-full"></div>
          <div class="bg-skeleton shimmer h-5 w-2/5 rounded-2"></div>
        </div>
      </div>

      <p
        v-else-if="!grants?.length"
        data-testid="admin-capabilities-row__granted-empty"
        class="text-ink-muted text-base"
      >
        {{ t('admin.capabilities.editor.empty') }}
      </p>

      <section-list v-else data-testid="admin-capabilities-row__granted-list">
        <div
          v-for="grant in grants"
          :key="grant.id"
          data-testid="admin-capabilities-row__granted-item"
          class="flex items-center gap-3"
        >
          <div class="bg-well size-9 shrink-0 overflow-hidden rounded-full">
            <avatar-image :avatar="grant.avatar_url ?? undefined" class="h-full w-full" />
          </div>

          <field-row :label="grant.display_name" class="flex-1">
            <ui-button
              neutral
              icon-only
              icon-left="delete"
              size="sm"
              data-testid="admin-capabilities-row__remove-button"
              @press="onRemoveMember(grant.id)"
            >
              {{ t('admin.capabilities.editor.remove') }}
            </ui-button>
          </field-row>
        </div>
      </section-list>
    </div>
  </div>
</template>
