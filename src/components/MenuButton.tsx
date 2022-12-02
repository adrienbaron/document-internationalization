import React, {useCallback, useMemo, useState} from 'react'
import {Text, Card, useClickOutside, Stack, Popover, Button, Box} from '@sanity/ui'
import {TranslateIcon} from '@sanity/icons'
import {useEditState} from 'sanity'
import LanguageOption from './LanguageOption'
import {useTranslationMetadata} from '../hooks/useLanguageMetadata'
import LanguageManage from './LanguageManage'
import LanguagePatch from './LanguagePatch'
import type {SupportedLanguagesConfig} from '../types'
import {useLanguages} from '../hooks/useLanguages'

type MenuButtonProps = {
  supportedLanguages: SupportedLanguagesConfig
  schemaType: string
  documentId: string
  languageField: string
}

export default function MenuButton(props: MenuButtonProps) {
  const {supportedLanguages, schemaType, documentId, languageField} = props

  const [open, setOpen] = useState(false)
  const handleClick = useCallback(() => setOpen((o) => !o), [])
  const [languagesPending, languagesList] = useLanguages(supportedLanguages)
  const [button, setButton] = useState<HTMLElement | null>(null)
  const [popover, setPopover] = useState<HTMLElement | null>(null)
  const handleClickOutside = useCallback(() => setOpen(false), [])
  useClickOutside(handleClickOutside, [button, popover])
  const {data: metadata, loading, error} = useTranslationMetadata(documentId, schemaType)
  const {draft, published} = useEditState(documentId, schemaType)
  const source = draft || published

  const sourceLanguageId = source?.[languageField] as string | undefined
  const sourceLanguageIsValid = useMemo(
    () => languagesList.some((l) => l.id === sourceLanguageId),
    [languagesList, sourceLanguageId]
  )

  const content = (
    <Box overflow="auto">
      {error ? (
        <Card tone="critical" padding={2}>
          <Text>Error: {error}</Text>
        </Card>
      ) : (
        <Stack padding={1} space={1}>
          {languagesList.length > 0 ? (
            <>
              {languagesList.map((language, langIndex) =>
                !loading && sourceLanguageId && sourceLanguageIsValid ? (
                  // Button to duplicate this document to a new translation
                  // And either create or update the metadata document
                  <LanguageOption
                    key={language.id}
                    index={langIndex}
                    language={language}
                    languageField={languageField}
                    schemaType={schemaType}
                    documentId={documentId}
                    disabled={loading}
                    current={language.id === sourceLanguageId}
                    metadata={metadata}
                    sourceId={documentId}
                    sourceLanguageId={sourceLanguageId}
                    translation={metadata?.translations.find((t) => t._key === language.id)}
                  />
                ) : (
                  // Button to set a language field on *this* document
                  <LanguagePatch
                    key={language.id}
                    languageField={languageField}
                    source={source}
                    documentId={documentId}
                    schemaType={schemaType}
                    language={language}
                    // Only allow language patch change to:
                    // - Keys not in metadata
                    // - The key of this document in the metadata
                    disabled={
                      metadata?.translations
                        .filter((t) => t?.value?._ref !== documentId)
                        .some((t) => t._key === language.id) ?? false
                    }
                  />
                )
              )}
              {/* Once metadata is loaded, there may be issues */}
              {loading ? null : (
                <>
                  {/* Current document has no language field */}
                  {sourceLanguageId ? null : (
                    <Card tone="caution" padding={3}>
                      <Text size={1}>
                        Choose a language to <br />
                        apply to <strong>this Document</strong>
                      </Text>
                    </Card>
                  )}
                  {/* Current document has an invalid language field */}
                  {sourceLanguageId && !sourceLanguageIsValid ? (
                    <Card tone="caution" padding={3}>
                      <Text size={1}>
                        Change the current language value <code>{sourceLanguageId}</code>
                        <br />
                        to one of the supported languages
                      </Text>
                    </Card>
                  ) : null}
                </>
              )}
            </>
          ) : null}
          <LanguageManage id={metadata?._id} />
        </Stack>
      )}
    </Box>
  )

  return (
    <Popover constrainSize content={content} open={open} portal ref={setPopover}>
      <Button
        text="Translations"
        mode="bleed"
        disabled={!source || languagesPending}
        loading={languagesPending}
        tone={
          !source || (!loading && sourceLanguageId && sourceLanguageIsValid) ? undefined : `caution`
        }
        icon={TranslateIcon}
        onClick={handleClick}
        ref={setButton}
        selected={open}
      />
    </Popover>
  )
}
