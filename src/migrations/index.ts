import * as migration_20260818_121208_initial from './20260818_121208_initial';
import * as migration_20260825_164845_add_show_in_about_strip from './20260825_164845_add_show_in_about_strip';
import * as migration_20260827_222159_add_article_category from './20260827_222159_add_article_category';
import * as migration_20260831_150000_add_portfolio_website from './20260831_150000_add_portfolio_website';
import * as migration_20260901_090000_add_article_drafts from './20260901_090000_add_article_drafts';
import * as migration_20260901_110000_articles_nullable_for_drafts from './20260901_110000_articles_nullable_for_drafts';
import * as migration_20260901_130000_seed_article_versions from './20260901_130000_seed_article_versions';
import * as migration_20260901_150000_drop_portfolio_cover from './20260901_150000_drop_portfolio_cover';
import * as migration_20260904_120000_add_portfolio_icon from './20260904_120000_add_portfolio_icon';
import * as migration_20260904_130000_drop_team from './20260904_130000_drop_team';
import * as migration_20261012_120000_add_reset_password_requested_at from './20261012_120000_add_reset_password_requested_at';

export const migrations = [
  {
    up: migration_20260818_121208_initial.up,
    down: migration_20260818_121208_initial.down,
    name: '20260818_121208_initial',
  },
  {
    up: migration_20260825_164845_add_show_in_about_strip.up,
    down: migration_20260825_164845_add_show_in_about_strip.down,
    name: '20260825_164845_add_show_in_about_strip',
  },
  {
    up: migration_20260827_222159_add_article_category.up,
    down: migration_20260827_222159_add_article_category.down,
    name: '20260827_222159_add_article_category'
  },
  {
    up: migration_20260831_150000_add_portfolio_website.up,
    down: migration_20260831_150000_add_portfolio_website.down,
    name: '20260831_150000_add_portfolio_website',
  },
  {
    up: migration_20260901_090000_add_article_drafts.up,
    down: migration_20260901_090000_add_article_drafts.down,
    name: '20260901_090000_add_article_drafts',
  },
  {
    up: migration_20260901_110000_articles_nullable_for_drafts.up,
    down: migration_20260901_110000_articles_nullable_for_drafts.down,
    name: '20260901_110000_articles_nullable_for_drafts',
  },
  {
    up: migration_20260901_130000_seed_article_versions.up,
    down: migration_20260901_130000_seed_article_versions.down,
    name: '20260901_130000_seed_article_versions',
  },
  {
    up: migration_20260901_150000_drop_portfolio_cover.up,
    down: migration_20260901_150000_drop_portfolio_cover.down,
    name: '20260901_150000_drop_portfolio_cover',
  },
  {
    up: migration_20260904_120000_add_portfolio_icon.up,
    down: migration_20260904_120000_add_portfolio_icon.down,
    name: '20260904_120000_add_portfolio_icon',
  },
  {
    up: migration_20260904_130000_drop_team.up,
    down: migration_20260904_130000_drop_team.down,
    name: '20260904_130000_drop_team',
  },
  {
    up: migration_20261012_120000_add_reset_password_requested_at.up,
    down: migration_20261012_120000_add_reset_password_requested_at.down,
    name: '20261012_120000_add_reset_password_requested_at',
  },
];
